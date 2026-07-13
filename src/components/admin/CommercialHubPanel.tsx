import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  FileCheck2,
  FileText,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { useCommercialHub } from "@/hooks/useCommercialHub";
import CommercialMeetingsPanel from "@/components/admin/commercial/CommercialMeetingsPanel";
import CommercialSamplesPanel from "@/components/admin/commercial/CommercialSamplesPanel";
import CommercialQuotationsPanel from "@/components/admin/commercial/CommercialQuotationsPanel";

type Tab = "meetings" | "samples" | "quotations";

export default function CommercialHubPanel() {
  const [tab, setTab] = useState<Tab>("meetings");
  const hub = useCommercialHub();

  return (
    <div className="space-y-5">
      <section className="border border-gold/40 bg-gold/[0.04] p-5 md:p-7 print:hidden">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-3">
            <FileCheck2 size={22} className="text-gold shrink-0 mt-1" />
            <div>
              <p className="eyebrow mb-2">Phase 3 · Commercial Operations</p>
              <h2 className="font-display text-2xl md:text-4xl">Commercial Hub</h2>
              <p className="mt-3 max-w-3xl text-sm text-foreground/65 leading-relaxed">
                Schedule buyer meetings, track sample development and prepare persistent quotation drafts with owner-controlled approval. Nothing is sent externally until an approved connector action is deliberately executed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void hub.reload()}
            disabled={hub.loading}
            className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"
          >
            <RefreshCw size={13} className={hub.loading ? "animate-spin" : ""} />
            Refresh hub
          </button>
        </div>
      </section>

      {hub.backendNotes.length > 0 && (
        <div className="print:hidden border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3 text-sm text-amber-200">
          <AlertTriangle size={17} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Backend activation status</p>
            <p className="mt-1 text-xs text-foreground/60">{hub.backendNotes.join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="print:hidden grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Buyer records" value={hub.buyers.length} />
        <Metric label="Meetings" value={hub.meetings.length} />
        <Metric label="Samples" value={hub.samples.length} />
        <Metric label="Quotations" value={hub.quotations.length} />
      </div>

      <div className="print:hidden flex gap-2 overflow-x-auto pb-1">
        <TabButton
          active={tab === "meetings"}
          onClick={() => setTab("meetings")}
          icon={<CalendarDays size={14} />}
          label="Meetings"
        />
        <TabButton
          active={tab === "samples"}
          onClick={() => setTab("samples")}
          icon={<PackageCheck size={14} />}
          label="Samples"
        />
        <TabButton
          active={tab === "quotations"}
          onClick={() => setTab("quotations")}
          icon={<FileText size={14} />}
          label="Quotations"
        />
      </div>

      {hub.loading ? (
        <div className="print:hidden py-16 text-center text-sm text-muted-foreground">
          Loading Commercial Hub…
        </div>
      ) : (
        <>
          <div className={tab === "meetings" ? "print:hidden" : "hidden"}>
            <CommercialMeetingsPanel
              buyers={hub.buyers}
              meetings={hub.meetings}
              setMeetings={hub.setMeetings}
            />
          </div>
          <div className={tab === "samples" ? "print:hidden" : "hidden"}>
            <CommercialSamplesPanel
              buyers={hub.buyers}
              samples={hub.samples}
              setSamples={hub.setSamples}
            />
          </div>
          <div className={tab === "quotations" ? "" : "hidden print:block"}>
            <CommercialQuotationsPanel
              buyers={hub.buyers}
              quotations={hub.quotations}
              quoteItems={hub.quoteItems}
              setQuotations={hub.setQuotations}
              setQuoteItems={hub.setQuoteItems}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/60 bg-card/25 p-4">
      <p className="font-display text-3xl tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
        {label}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 inline-flex items-center gap-2 border px-4 text-[10px] uppercase tracking-[0.17em] ${
        active
          ? "border-gold text-gold bg-gold/5"
          : "border-border/60 text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
