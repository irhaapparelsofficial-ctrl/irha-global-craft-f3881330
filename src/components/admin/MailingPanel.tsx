import { useState } from "react";
import { ChevronDown, ChevronUp, Settings2, ShieldCheck } from "lucide-react";
import CampaignPrivateFileFanoutPanel from "@/components/admin/CampaignPrivateFileFanoutPanel";
import ChannelCandidateActivationPanel from "@/components/admin/ChannelCandidateActivationPanel";
import LeadBulkOperationsPanel from "@/components/admin/LeadBulkOperationsPanel";
import OutreachApprovalPanel from "@/components/admin/OutreachApprovalPanel";

export default function MailingPanel() {
  const [crmVersion, setCrmVersion] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const refreshOutreach = () => {
    setCrmVersion((value) => value + 1);
    setReviewOpen(true);
  };

  return (
    <div className="space-y-5">
      <LeadBulkOperationsPanel onDraftsPrepared={refreshOutreach} />

      <section className="border border-border/50 bg-card/15">
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left"
        >
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Settings2 size={14} /> Optional tools
            </div>
            <p className="mt-1 text-xs text-foreground/55">Lead activation and private-file preparation. Normal daily outreach does not need these.</p>
          </div>
          {advancedOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
        {advancedOpen && (
          <div className="space-y-5 border-t border-border/50 p-3 sm:p-5">
            <ChannelCandidateActivationPanel onActivated={refreshOutreach} />
            <CampaignPrivateFileFanoutPanel onPrepared={refreshOutreach} />
          </div>
        )}
      </section>

      <section className="border border-gold/45 bg-card/25">
        <button
          type="button"
          onClick={() => setReviewOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
        >
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold">
              <ShieldCheck size={14} /> Step 3
            </div>
            <h2 className="mt-2 font-display text-2xl">Review drafts and send</h2>
            <p className="mt-1 text-xs text-foreground/65">Open the prepared emails, make any changes, then approve one message at a time.</p>
          </div>
          {reviewOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {reviewOpen && (
          <div className="border-t border-gold/25 p-3 sm:p-5">
            <OutreachApprovalPanel key={crmVersion} />
          </div>
        )}
      </section>
    </div>
  );
}
