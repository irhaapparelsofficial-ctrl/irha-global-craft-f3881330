import { ClipboardCheck, ExternalLink, FileCheck2, ImagePlus, RotateCcw } from "lucide-react";
import type { ReworkStatus } from "@/lib/productionQuality";
import type { DefectRow, EvidenceRow, InspectionRow, SampleApprovalRow } from "./types";
import { Empty, Field, ListCard, Loading, Select, Status, label } from "./ui";

const REWORK_STATUSES: ReworkStatus[] = ["open", "assigned", "in_progress", "verified", "closed", "waived"];

export default function QualityLists({
  loading,
  inspections,
  defects,
  approvals,
  evidence,
  busy,
  reworkEdits,
  setReworkEdit,
  onSaveRework,
  onOpenEvidence,
  onVerifyEvidence,
}: {
  loading: boolean;
  inspections: InspectionRow[];
  defects: DefectRow[];
  approvals: SampleApprovalRow[];
  evidence: EvidenceRow[];
  busy: string | null;
  reworkEdits: Record<string, { status: ReworkStatus; rootCause: string; correctiveAction: string }>;
  setReworkEdit: (id: string, value: { status: ReworkStatus; rootCause: string; correctiveAction: string }) => void;
  onSaveRework: (row: DefectRow) => Promise<void>;
  onOpenEvidence: (row: EvidenceRow) => Promise<void>;
  onVerifyEvidence: (row: EvidenceRow, status: "verified" | "rejected") => Promise<void>;
}) {
  return (
    <div className="grid xl:grid-cols-2 gap-5">
      <ListCard title={`Inspections · ${inspections.length}`} icon={<ClipboardCheck size={16} />}>
        {loading ? <Loading /> : inspections.length === 0 ? <Empty text="No inspection recorded." compact /> : inspections.map((row) => (
          <article key={row.id} className="border border-border/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[9px] uppercase tracking-[0.13em] text-gold">{row.inspection_number} · {label(row.inspection_type)}</p><p className="text-sm mt-1">{row.inspected_quantity} inspected · {row.passed_quantity} passed · {row.failed_quantity} failed</p></div>
              <Status value={row.status} />
            </div>
            {row.notes && <p className="text-xs text-foreground/55 mt-2">{row.notes}</p>}
          </article>
        ))}
      </ListCard>

      <ListCard title={`Defects & rework · ${defects.length}`} icon={<RotateCcw size={16} />}>
        {loading ? <Loading /> : defects.length === 0 ? <Empty text="No defect recorded." compact /> : defects.map((row) => {
          const edit = reworkEdits[row.id] || { status: row.rework_status, rootCause: row.root_cause || "", correctiveAction: row.corrective_action || "" };
          return (
            <article key={row.id} className="border border-border/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div><p className={`text-[9px] uppercase tracking-[0.13em] ${row.severity === "critical" ? "text-red-300" : row.severity === "major" ? "text-amber-300" : "text-gold"}`}>{row.severity} · qty {row.quantity}</p><p className="text-sm mt-1">{row.description}</p><p className="text-[10px] text-muted-foreground mt-1">{row.defect_category}{row.location ? ` · ${row.location}` : ""}</p></div>
                <Status value={row.rework_status} />
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mt-3">
                <Select label="Rework status" value={edit.status} onChange={(value) => setReworkEdit(row.id, { ...edit, status: value as ReworkStatus })} options={REWORK_STATUSES} />
                <Field label="Root cause" value={edit.rootCause} onChange={(value) => setReworkEdit(row.id, { ...edit, rootCause: value })} />
                <Field label="Corrective action" value={edit.correctiveAction} onChange={(value) => setReworkEdit(row.id, { ...edit, correctiveAction: value })} />
              </div>
              <button type="button" onClick={() => void onSaveRework(row)} disabled={busy !== null} className="mt-3 min-h-9 border border-gold/50 text-gold px-3 text-[9px] uppercase tracking-[0.12em] disabled:opacity-50">{busy === `rework:${row.id}` ? "Saving…" : "Save rework evidence"}</button>
            </article>
          );
        })}
      </ListCard>

      <ListCard title={`Sample decisions · ${approvals.length}`} icon={<FileCheck2 size={16} />}>
        {approvals.length === 0 ? <Empty text="No sample decision recorded." compact /> : approvals.map((row) => (
          <article key={row.id} className="border border-border/50 p-3">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.13em] text-gold">Round {row.sample_round} · {row.decision_source}</p><p className="text-sm mt-1">{row.approved_specification_reference || row.decision_reference || "Reference pending"}</p></div><Status value={row.status} /></div>
            {row.notes && <p className="text-xs text-foreground/55 mt-2">{row.notes}</p>}
          </article>
        ))}
      </ListCard>

      <ListCard title={`Private evidence · ${evidence.length}`} icon={<ImagePlus size={16} />}>
        {evidence.length === 0 ? <Empty text="No private evidence uploaded." compact /> : evidence.map((row) => (
          <article key={row.id} className="border border-border/50 p-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.13em] text-gold">{label(row.evidence_type)}</p><p className="text-sm mt-1 truncate">{row.file_name}</p><p className="text-[10px] text-muted-foreground mt-1">{(row.size_bytes / 1024 / 1024).toFixed(2)} MB · private signed access only</p></div><Status value={row.verification_status} /></div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={() => void onOpenEvidence(row)} disabled={busy !== null} className="min-h-9 inline-flex items-center gap-1 border border-border/60 px-3 text-[9px] uppercase tracking-[0.11em] disabled:opacity-50"><ExternalLink size={11} /> Open 5 min</button>
              <button type="button" onClick={() => void onVerifyEvidence(row, "verified")} disabled={busy !== null} className="min-h-9 border border-emerald-500/40 text-emerald-300 px-3 text-[9px] uppercase tracking-[0.11em] disabled:opacity-50">Verify</button>
              <button type="button" onClick={() => void onVerifyEvidence(row, "rejected")} disabled={busy !== null} className="min-h-9 border border-red-500/40 text-red-300 px-3 text-[9px] uppercase tracking-[0.11em] disabled:opacity-50">Reject</button>
            </div>
          </article>
        ))}
      </ListCard>
    </div>
  );
}
