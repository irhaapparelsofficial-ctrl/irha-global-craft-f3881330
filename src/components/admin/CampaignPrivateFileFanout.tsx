import { useMemo, useRef, useState } from "react";
import { AlertTriangle, FileCheck2, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;
const FILE_BUCKET = "crm-private-files";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const EDITABLE_STATUSES = new Set(["draft", "failed", "manual_required", "rejected"]);

export type CampaignFileRow = {
  id: string;
  source_type: string;
  source_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  description: string | null;
};

type CampaignMessageTarget = {
  id: string;
  lead_id: string;
  recipient_company: string;
  status: string;
};

type CreatedFile = CampaignFileRow & {
  bucket: string;
  object_path: string;
};

type Props = {
  campaignId: string | null;
  campaignName: string;
  messages: CampaignMessageTarget[];
  onUploaded: (files: CampaignFileRow[]) => void;
};

export default function CampaignPrivateFileFanout({ campaignId, campaignName, messages, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [description, setDescription] = useState("Campaign catalogue");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{ created: number; skipped: number } | null>(null);

  const targets = useMemo(() => {
    const byLead = new Map<string, CampaignMessageTarget>();
    for (const message of messages) {
      if (EDITABLE_STATUSES.has(message.status) && !byLead.has(message.lead_id)) byLead.set(message.lead_id, message);
    }
    return [...byLead.values()];
  }, [messages]);

  const prepareFile = async (file: File) => {
    if (!campaignId || !targets.length) {
      toast({ title: "Select a campaign with editable drafts", variant: "destructive" });
      return;
    }
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      toast({ title: "Unsupported campaign file", description: "Use PDF, JPG, PNG, WEBP or DOCX.", variant: "destructive" });
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      toast({ title: "Campaign file is too large", description: "Use a real file up to 10 MB so it remains inside the email attachment safety limit.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Prepare one isolated private copy of ${file.name} for ${targets.length} campaign buyer${targets.length === 1 ? "" : "s"}? Nothing will be approved or sent.`)) return;

    setBusy(true);
    setLastResult(null);
    const marker = `[campaign:${campaignId}]`;
    const leadIds = targets.map((target) => target.lead_id);
    const existingResult = await db.from("crm_files")
      .select("id,source_type,source_id,file_name,mime_type,size_bytes,category,description")
      .eq("source_type", "prospect")
      .in("source_id", leadIds)
      .eq("file_name", file.name)
      .eq("size_bytes", file.size)
      .limit(500);

    if (existingResult.error) {
      setBusy(false);
      toast({ title: "Existing private files could not be checked", description: existingResult.error.message, variant: "destructive" });
      return;
    }

    const existingByLead = new Map<string, CampaignFileRow>();
    for (const row of (existingResult.data || []) as CampaignFileRow[]) {
      if ((row.description || "").includes(marker)) existingByLead.set(row.source_id, row);
    }

    const created: CreatedFile[] = [];
    try {
      for (const target of targets) {
        if (existingByLead.has(target.lead_id)) continue;
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "campaign-file";
        const objectPath = `prospect/${target.lead_id}/campaign-${campaignId}/${crypto.randomUUID()}-${safeName}`;
        const storageResult = await supabase.storage.from(FILE_BUCKET).upload(objectPath, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: "3600",
        });
        if (storageResult.error) throw new Error(`${target.recipient_company}: ${storageResult.error.message}`);

        const metadataResult = await db.from("crm_files").insert({
          source_type: "prospect",
          source_id: target.lead_id,
          bucket: FILE_BUCKET,
          object_path: objectPath,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          category: "reference",
          description: `${marker} ${description.trim() || "Campaign catalogue"}`,
        }).select("id,source_type,source_id,bucket,object_path,file_name,mime_type,size_bytes,category,description").single();

        if (metadataResult.error || !metadataResult.data) {
          await supabase.storage.from(FILE_BUCKET).remove([objectPath]);
          throw new Error(`${target.recipient_company}: ${metadataResult.error?.message || "File metadata could not be saved"}`);
        }
        created.push(metadataResult.data as CreatedFile);
      }
    } catch (error) {
      for (const item of [...created].reverse()) {
        await db.from("crm_files").delete().eq("id", item.id);
        await supabase.storage.from(FILE_BUCKET).remove([item.object_path]);
      }
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      toast({
        title: "Campaign file preparation rolled back safely",
        description: error instanceof Error ? error.message : "No partial campaign file set was kept.",
        variant: "destructive",
      });
      return;
    }

    const allRows = [...existingByLead.values(), ...created];
    onUploaded(allRows);
    setLastResult({ created: created.length, skipped: targets.length - created.length });
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    toast({
      title: created.length ? "Private campaign copies prepared" : "Campaign file already prepared",
      description: `${created.length} new, ${targets.length - created.length} existing. They are selected in the editor only; save each draft to persist attachment selection. Nothing was sent.`,
    });
  };

  return (
    <section className="border border-gold/35 bg-gold/[0.035] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-gold"><ShieldCheck size={16} /><p className="eyebrow">Private campaign file</p></div>
          <h3 className="mt-2 font-display text-2xl">Upload once → isolated buyer copies</h3>
          <p className="mt-2 text-xs leading-relaxed text-foreground/65">For {campaignName || "the selected campaign"}, one real catalogue or reference file is copied into each editable buyer's private storage folder. Existing matching copies are skipped. Any partial failure is rolled back. No approval or provider send occurs here.</p>
        </div>
        <div className="min-w-[240px] border border-border/60 bg-background/30 p-3 text-xs">
          <p className="flex items-center gap-2"><FileCheck2 size={14} className="text-gold" /> {targets.length} editable buyer{targets.length === 1 ? "" : "s"}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">PDF/JPG/PNG/WEBP/DOCX · max 10 MB</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Internal description" className="outreach-input" />
        <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-gold/60 px-4 text-[10px] uppercase tracking-[0.16em] text-gold hover:bg-gold/5 ${busy || !campaignId || !targets.length ? "pointer-events-none opacity-40" : ""}`}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
          {busy ? "Preparing copies" : "Choose campaign file"}
          <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" disabled={busy || !campaignId || !targets.length} onChange={(event) => { const file = event.target.files?.[0]; if (file) void prepareFile(file); }} />
        </label>
      </div>

      {lastResult && <div className="mt-3 flex items-start gap-2 border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200"><FileCheck2 size={14} className="mt-0.5 shrink-0" />Prepared: {lastResult.created} new private copies, {lastResult.skipped} existing copies. Open each draft and press Save draft after reviewing its selected file.</div>}
      <div className="mt-3 flex items-start gap-2 text-[10px] text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0" />This tool does not fabricate a catalogue. Upload only a final, truthful file that you have reviewed.</div>
    </section>
  );
}
