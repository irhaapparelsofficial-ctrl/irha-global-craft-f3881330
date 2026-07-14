import { useState } from "react";
import CampaignPrivateFileFanoutPanel from "@/components/admin/CampaignPrivateFileFanoutPanel";
import ChannelCandidateActivationPanel from "@/components/admin/ChannelCandidateActivationPanel";
import LeadBulkOperationsPanel from "@/components/admin/LeadBulkOperationsPanel";
import OutreachApprovalPanel from "@/components/admin/OutreachApprovalPanel";

export default function MailingPanel() {
  const [crmVersion, setCrmVersion] = useState(0);
  const refreshOutreach = () => setCrmVersion((value) => value + 1);

  return (
    <div className="space-y-6">
      <ChannelCandidateActivationPanel onActivated={refreshOutreach} />
      <LeadBulkOperationsPanel onDraftsPrepared={refreshOutreach} />
      <CampaignPrivateFileFanoutPanel onPrepared={refreshOutreach} />
      <OutreachApprovalPanel key={crmVersion} />
    </div>
  );
}
