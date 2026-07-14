import { useState } from "react";
import ChannelCandidateActivationPanel from "@/components/admin/ChannelCandidateActivationPanel";
import OutreachApprovalPanel from "@/components/admin/OutreachApprovalPanel";

export default function MailingPanel() {
  const [crmVersion, setCrmVersion] = useState(0);
  return (
    <div className="space-y-6">
      <ChannelCandidateActivationPanel onActivated={() => setCrmVersion((value) => value + 1)} />
      <OutreachApprovalPanel key={crmVersion} />
    </div>
  );
}
