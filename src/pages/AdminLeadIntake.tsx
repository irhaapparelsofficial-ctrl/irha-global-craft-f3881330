import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { parseLeadWorkbook, type LeadIntakeRow, type LeadWorkbook } from "@/lib/leadIntake";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const CHUNK_SIZE = 100;

type ImportFileStatus = "pending_upload" | "uploaded" | "staged" | "failed" | "archived";
type ImportFileRow = {
  id: string;
  campaign_id: string;
  object_path: string;
  parsed_row_count: number;
  staged_row_count: number;
  duplicate_count: number;
  blocked_count: number;
  status: ImportFileStatus;
  error: string | null;
};
type StageSummary = {
  received: number;
  staged: number;
  duplicates: number;
  blocked: number;
  campaignId: string | null;
  sourceFileStatus: "staged" | "reused";
  sourceFileRecordId: string | null;
};
type FileCheckpoint = { recordId: string; campaignId: string; status: ImportFileStatus };

type RegistryResponse = {
  ok?: boolean;
  found?: boolean;
  file?: ImportFileRow | null;
  upload_required?: boolean;
  reused?: boolean;
  signed_url?: string;
  error?: string;
};

export default function AdminLeadIntake() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [workbook, setWorkbook] = useState<LeadWorkbook | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceChecksum, setSourceChecksum] = useState("");
  const [fileCheckpoint, setFileCheckpoint] = useState<FileCheckpoint | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [staging, setStaging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<StageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sheet = workbook?.sheets.find((item) => item.name === sheetName) || workbook?.sheets[0] || null;
  const deduped = useMemo(() => dedupeRows(sheet?.rows || []), [sheet]);
  const stageable = useMemo(() => deduped.unique.filter((row) => Boolean(row.companyName && row.sourceUrl)), [deduped.unique]);
  const strictReady = useMemo(() => stageable.filter((row) => row.blockers.length === 0), [stageable]);
  const needsReview = useMemo(() => stageable.filter((row) => row.blockers.length > 0), [stageable]);
  const blocked = useMemo(() => deduped.unique.filter((row) => !row.companyName || !row.sourceUrl), [deduped.unique]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File is too large", description: "Use an XLSX or CSV file smaller than 25 MB.", variant: "destructive" });
      return;
    }
    setParsing(true);
    setError(null);
    setSummary(null);
    setFileCheckpoint(null);
    try {
      const [parsed, checksum] = await Promise.all([parseLeadWorkbook(file), sha256(file)]);
      setWorkbook(parsed);
      setSourceFile(file);
      setSourceChecksum(checksum);
      setSheetName(parsed.sheets[0]?.name || "");
      toast({
        title: "Lead workbook parsed",
        description: `${parsed.sheets.length} recognizable lead sheet${parsed.sheets.length === 1 ? "" : "s"} found. The original file will be retained privately after owner-confirmed staging.`,
      });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Workbook could not be parsed";
      setWorkbook(null);
      setSourceFile(null);
      setSourceChecksum("");
      setSheetName("");
      setError(message);
      toast({ title: "Lead file rejected", description: message, variant: "destructive" });
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const stageWorkbook = async () => {
    if (!user || !workbook || !sourceFile || !sourceChecksum || !sheet || stageable.length === 0 || staging) return;
    const confirmed = window.confirm(
      `Stage ${stageable.length} unique companies from ${workbook.filename} / ${sheet.name}?\n\n`
      + `${strictReady.length} are strict-ready and ${needsReview.length} need review. `
      + `${deduped.duplicates.length} duplicates inside this sheet and ${blocked.length} rows without a public source will not be staged.\n\n`
      + "The original workbook will be retained in private owner storage for audit. This creates candidate-review records only. It does not import to Buyer CRM and does not send any email or WhatsApp message.",
    );
    if (!confirmed) return;

    setStaging(true);
    setProgress(0);
    setError(null);
    let campaignId: string | null = fileCheckpoint?.campaignId || null;
    let importFileId: string | null = fileCheckpoint?.recordId || null;
    let sourceFileStatus: "staged" | "reused" = fileCheckpoint ? "reused" : "staged";
    const totals: StageSummary = {
      received: stageable.length,
      staged: 0,
      duplicates: deduped.duplicates.length,
      blocked: blocked.length,
      campaignId,
      sourceFileStatus,
      sourceFileRecordId: importFileId,
    };

    try {
      const existing = await lookupSourceFile(sourceChecksum, sheet.name, sourceFile.name);
      if (existing) {
        campaignId = existing.campaign_id;
        importFileId = existing.id;
        sourceFileStatus = "reused";
        setFileCheckpoint({ recordId: existing.id, campaignId: existing.campaign_id, status: existing.status });
        if (existing.status === "staged") {
          const reused: StageSummary = {
            received: existing.parsed_row_count,
            staged: existing.staged_row_count,
            duplicates: existing.duplicate_count,
            blocked: existing.blocked_count,
            campaignId: existing.campaign_id,
            sourceFileStatus: "reused",
            sourceFileRecordId: existing.id,
          };
          setProgress(100);
          setSummary(reused);
          toast({ title: "Workbook already staged", description: "The saved private checkpoint was reused. No duplicate file, candidate import, email or WhatsApp send occurred." });
          return;
        }
      }

      const chunks = chunk(stageable, CHUNK_SIZE);
      for (let index = 0; index < chunks.length; index += 1) {
        const rows = chunks[index];
        const { data, error: invokeError } = await supabase.functions.invoke("lead-bulk-stage", {
          body: {
            action: "stage",
            campaign_id: campaignId,
            source_file: workbook.filename,
            source_sheet: sheet.name,
            batch_total: stageable.length,
            rows: rows.map(toPayload),
          },
        });
        if (invokeError || data?.ok !== true) throw new Error(data?.error || invokeError?.message || `Chunk ${index + 1} failed`);
        campaignId = String(data.campaign_id || campaignId || "") || null;
        if (!campaignId) throw new Error("Candidate campaign was not created");
        totals.campaignId = campaignId;
        totals.staged += Number(data.staged_count || 0);
        const retryDuplicates = Array.isArray(data.duplicates)
          ? data.duplicates.filter((item: Record<string, unknown>) => item.retry_safe === true).length
          : 0;
        totals.duplicates += Math.max(0, Number(data.duplicate_count || 0) - retryDuplicates);
        totals.blocked += Number(data.blocked_count || 0);

        if (!importFileId) {
          const prepared = await prepareSourceFile({
            campaignId,
            file: sourceFile,
            checksum: sourceChecksum,
            sheetName: sheet.name,
            parsedRowCount: sheet.rawRowCount,
            totals,
          });
          importFileId = prepared.file?.id || null;
          if (!importFileId) throw new Error("Private source-file record was not created");
          if (prepared.upload_required) {
            if (!prepared.signed_url) throw new Error("Private signed file route was not returned");
            await sendBinaryToSignedRoute(prepared.signed_url, sourceFile, leadFileMimeType(sourceFile));
            const confirmedFile = await confirmSourceFile(importFileId, sheet.rawRowCount, totals);
            setFileCheckpoint({ recordId: confirmedFile.id, campaignId, status: confirmedFile.status });
          } else if (prepared.file) {
            setFileCheckpoint({ recordId: prepared.file.id, campaignId, status: prepared.file.status });
          }
          totals.sourceFileRecordId = importFileId;
        }

        await saveSourceCheckpoint(importFileId, "uploaded", sheet.rawRowCount, totals, null);
        setProgress(Math.round(((index + 1) / chunks.length) * 100));
      }

      if (!campaignId || !importFileId) throw new Error("Private source-file checkpoint was not completed");
      const { data: finalData, error: finalError } = await supabase.functions.invoke("lead-bulk-stage", {
        body: { action: "finalize", campaign_id: campaignId },
      });
      if (finalError || finalData?.ok !== true) throw new Error(finalData?.error || finalError?.message || "Campaign finalization failed");
      totals.staged = Number(finalData?.campaign?.discovered_count ?? totals.staged);
      totals.sourceFileStatus = sourceFileStatus;
      totals.sourceFileRecordId = importFileId;
      await saveSourceCheckpoint(importFileId, "staged", sheet.rawRowCount, totals, null);
      setFileCheckpoint({ recordId: importFileId, campaignId, status: "staged" });
      setSummary(totals);
      toast({
        title: "Lead staging completed",
        description: `${totals.staged} candidates in review · ${totals.duplicates} duplicates skipped · ${totals.blocked} blocked. Original workbook retained privately. No message was sent.`,
      });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Lead staging failed";
      if (importFileId && sheet) {
        await saveSourceCheckpoint(importFileId, "failed", sheet.rawRowCount, totals, message, false);
        if (campaignId) setFileCheckpoint({ recordId: importFileId, campaignId, status: "failed" });
      }
      setError(`${message}${campaignId ? ` Campaign checkpoint: ${campaignId}` : ""}`);
      toast({ title: "Lead staging stopped safely", description: message, variant: "destructive" });
    } finally {
      setStaging(false);
    }
  };

  const exportExceptions = () => {
    const rows = [
      ...blocked.map((row) => ({ ...row, exception: "Missing company or public source URL" })),
      ...deduped.duplicates.map((row) => ({ ...row, exception: "Duplicate inside selected sheet" })),
    ];
    const headers = ["Source Row", "Company", "Country", "Email", "WhatsApp", "Website", "Source URL", "Exception", "Review Blockers"];
    const csv = [headers, ...rows.map((row) => [row.sourceRow, row.companyName, row.country, row.email, row.whatsapp, row.website, row.sourceUrl, row.exception, row.blockers.join(" | ")])]
      .map((values) => values.map(csvCell).join(",")).join("\r\n");
    download(`irha-lead-intake-exceptions-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${csv}`);
  };

  if (authLoading) return <Centered>Checking owner access…</Centered>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Centered>Admin access is required.</Centered>;

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6 lg:p-8">
      <SEO title="Lead Intake Center — Irha Apparels" description="Private owner bulk lead staging center." path="/admin/lead-intake" noindex />
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Owner-only · Candidate staging</p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl">Bulk Lead Intake Center</h1>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                Upload an XLSX or CSV. The browser previews and normalizes it, while authenticated Edge Functions retain the original file privately and stage unique companies in restartable 100-row chunks. A valid business email or WhatsApp number is accepted. CRM promotion and all messaging remain separate owner approvals.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/admin" className="inline-flex min-h-11 items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-gold hover:text-gold"><ArrowLeft size={12} /> Admin</a>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={parsing || staging} className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold/50 px-4 text-[10px] uppercase tracking-[0.15em] text-gold hover:bg-gold hover:text-background disabled:opacity-40"><Upload size={13} /> Choose XLSX/CSV</button>
              <input ref={inputRef} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => void readFile(event.target.files?.[0])} />
            </div>
          </div>
        </header>

        <div className="border border-sky-500/30 bg-sky-500/[0.04] p-4 text-sm text-foreground/70">
          <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-sky-300" /><p>The original workbook receives a short-lived, checksum-scoped private write route from an admin-only backend function. It never receives a public URL. Checkpoints prevent duplicate files and duplicate candidate rows on retry.</p></div>
        </div>

        {error && <div className="border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}

        {!workbook ? (
          <section className="border border-dashed border-border/60 p-12 text-center">
            {parsing ? <Loader2 size={32} className="mx-auto animate-spin text-gold" /> : <FileSpreadsheet size={36} className="mx-auto text-gold" />}
            <h2 className="mt-4 font-display text-2xl">{parsing ? "Reading lead workbook…" : "Choose the master lead file"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">The parser supports title rows, email-only contacts, WhatsApp-only contacts and combined Phone / WhatsApp columns.</p>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Metric label="Rows read" value={sheet?.rawRowCount || 0} icon={<FileSpreadsheet size={14} />} />
              <Metric label="Unique rows" value={deduped.unique.length} icon={<Users size={14} />} />
              <Metric label="Strict ready" value={strictReady.length} icon={<CheckCircle2 size={14} />} />
              <Metric label="Needs review" value={needsReview.length} icon={<AlertTriangle size={14} />} />
              <Metric label="File duplicates" value={deduped.duplicates.length} icon={<RefreshCw size={14} />} />
            </section>

            <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="border border-border/60 bg-card/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Workbook</p>
                <p className="mt-2 break-all font-display text-xl">{workbook.filename}</p>
                <p className="mt-2 break-all text-[10px] text-muted-foreground">Private checksum: {sourceChecksum.slice(0, 16)}…</p>
                <label className="mt-5 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Lead sheet</label>
                <select value={sheet?.name || ""} onChange={(event) => { setSheetName(event.target.value); setSummary(null); setProgress(0); setFileCheckpoint(null); }} className="mt-2 min-h-12 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold">
                  {workbook.sheets.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.rows.length} rows</option>)}
                </select>
                <div className="mt-5 space-y-2 text-xs text-foreground/65">
                  <p>Detected header row: {sheet?.headerRow || "—"}</p>
                  <p>Backend chunk size: {CHUNK_SIZE}</p>
                  <p>Stageable: {stageable.length}</p>
                  <p>Missing source/company: {blocked.length}</p>
                  <p>Private file: {fileCheckpoint?.status || "not retained"}</p>
                </div>
                <button type="button" onClick={exportExceptions} disabled={blocked.length + deduped.duplicates.length === 0} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-35"><Download size={12} /> Export exceptions</button>
              </aside>

              <section className="border border-border/60 bg-card/25">
                <div className="border-b border-border/60 p-4 sm:p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Preview · first 100 unique rows</p><h2 className="mt-1 font-display text-2xl">Review before staging</h2></div>
                <div className="max-h-[58vh] divide-y divide-border/50 overflow-y-auto">
                  {deduped.unique.slice(0, 100).map((row) => (
                    <article key={`${row.sourceRow}-${row.fingerprint}`} className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0"><p className="font-display text-lg">{row.companyName}</p><p className="mt-1 break-all text-[10px] text-gold">{row.email || row.whatsapp || "Contact route missing"}</p></div>
                        <span className={`self-start border px-2 py-1 text-[9px] uppercase tracking-[0.13em] ${row.blockers.length === 0 ? "border-emerald-500/40 text-emerald-300" : row.sourceUrl ? "border-amber-500/40 text-amber-300" : "border-red-500/40 text-red-300"}`}>{row.blockers.length === 0 ? "Strict ready" : row.sourceUrl ? "Needs review" : "Blocked"}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Row {row.sourceRow} · {row.country || "Country missing"} · {row.buyerType || "Buyer type missing"}</p>
                      <p className="mt-1 text-xs text-foreground/65">{row.productFit.length ? row.productFit.join(" · ") : "Product fit missing"}</p>
                      {row.blockers.length > 0 && <p className="mt-2 text-[10px] text-amber-300">Review needs: {row.blockers.join(" · ")}</p>}
                    </article>
                  ))}
                </div>
                <div className="border-t border-border/60 p-4 sm:p-5">
                  {staging && <div className="mb-3"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-center text-[10px] text-muted-foreground">Staging checkpoint {progress}%</p></div>}
                  <button type="button" onClick={() => void stageWorkbook()} disabled={staging || parsing || stageable.length === 0} className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-gradient-gold px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-40">{staging ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Stage {stageable.length} unique companies for owner review</button>
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">Private source-file retention only. No CRM import and no message send occurs in this step.</p>
                </div>
              </section>
            </section>
          </>
        )}

        {summary && (
          <section className="border border-emerald-500/35 bg-emerald-500/5 p-5">
            <div className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-300" /><div><h2 className="font-display text-2xl">Staging checkpoint completed</h2><p className="mt-2 text-sm text-foreground/70">{summary.staged} candidates in review · {summary.duplicates} duplicates skipped · {summary.blocked} blocked. Campaign: <span className="break-all text-gold">{summary.campaignId}</span></p><p className="mt-1 text-xs text-foreground/60">Private source workbook: {summary.sourceFileStatus} · audit record <span className="break-all">{summary.sourceFileRecordId}</span></p><a href="/admin" className="mt-4 inline-flex min-h-11 items-center border border-emerald-500/40 px-4 text-[10px] uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-500/10">Open AI Outreach and approve strict-ready companies</a></div></div>
          </section>
        )}
      </div>
    </main>
  );
}

async function registry(body: Record<string, unknown>): Promise<RegistryResponse> {
  const { data, error } = await supabase.functions.invoke("lead-file-registry", { body });
  if (error || data?.ok !== true) throw new Error(data?.error || error?.message || "Private lead-file operation failed");
  return data as RegistryResponse;
}

async function lookupSourceFile(checksum: string, sheetName: string, fileName: string) {
  const data = await registry({ action: "lookup", checksum_sha256: checksum, sheet_name: sheetName, file_name: fileName });
  return data.found ? data.file || null : null;
}

async function prepareSourceFile(input: { campaignId: string; file: File; checksum: string; sheetName: string; parsedRowCount: number; totals: StageSummary }) {
  return await registry({
    action: "prepare",
    campaign_id: input.campaignId,
    file_name: input.file.name,
    mime_type: leadFileMimeType(input.file),
    size_bytes: input.file.size,
    checksum_sha256: input.checksum,
    sheet_name: input.sheetName,
    parsed_row_count: input.parsedRowCount,
    staged_row_count: input.totals.staged,
    duplicate_count: input.totals.duplicates,
    blocked_count: input.totals.blocked,
  });
}

async function sendBinaryToSignedRoute(signedUrl: string, file: File, mimeType: string) {
  const response = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": mimeType, "x-upsert": "false" }, body: file });
  if (!response.ok) throw new Error(`Private file transfer failed (${response.status})`);
}

async function confirmSourceFile(fileId: string, parsedRowCount: number, totals: StageSummary): Promise<ImportFileRow> {
  const data = await registry({
    action: "confirm",
    file_id: fileId,
    parsed_row_count: parsedRowCount,
    staged_row_count: totals.staged,
    duplicate_count: totals.duplicates,
    blocked_count: totals.blocked,
  });
  if (!data.file) throw new Error("Private source-file confirmation returned no record");
  return data.file;
}

async function saveSourceCheckpoint(fileId: string, status: ImportFileStatus, parsedRowCount: number, totals: StageSummary, errorText: string | null, required = true) {
  try {
    await registry({
      action: "checkpoint",
      file_id: fileId,
      status,
      parsed_row_count: parsedRowCount,
      staged_row_count: totals.staged,
      duplicate_count: totals.duplicates,
      blocked_count: totals.blocked,
      error: errorText,
    });
  } catch (failure) {
    if (required) throw failure;
  }
}

function dedupeRows(rows: LeadIntakeRow[]) {
  const seen = new Set<string>();
  const unique: LeadIntakeRow[] = [];
  const duplicates: LeadIntakeRow[] = [];
  for (const row of rows) {
    if (seen.has(row.fingerprint)) duplicates.push(row);
    else { seen.add(row.fingerprint); unique.push(row); }
  }
  return { unique, duplicates };
}

function toPayload(row: LeadIntakeRow) {
  return {
    sourceRow: row.sourceRow,
    companyName: row.companyName,
    country: row.country,
    city: row.city,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    buyerType: row.buyerType,
    productFit: row.productFit,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    sourceConfidence: row.sourceConfidence,
    emailVerification: row.emailVerification,
    linkedinUrl: row.linkedinUrl,
    instagramUrl: row.instagramUrl,
    facebookUrl: row.facebookUrl,
    priority: row.priority,
    notes: row.notes,
    fingerprint: row.fingerprint,
  };
}
function chunk<T>(values: T[], size: number) { const output: T[][] = []; for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size)); return output; }
function leadFileMimeType(file: File) { return file.name.toLowerCase().endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; }
async function sha256(file: File) { const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join(""); }
function csvCell(value: unknown) { const text = value === null || value === undefined ? "" : String(value); const safe = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replace(/"/g, '""')}"`; }
function download(filename: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="border border-border/60 bg-card/30 p-4"><div className="flex items-center gap-2 text-gold">{icon}<p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p></div><p className="mt-2 font-display text-2xl tabular-nums">{value.toLocaleString()}</p></div>; }
function Centered({ children }: { children: React.ReactNode }) { return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">{children}</div>; }
