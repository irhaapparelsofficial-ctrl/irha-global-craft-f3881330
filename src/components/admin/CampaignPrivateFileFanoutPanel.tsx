import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import CampaignPrivateFileFanout, { type CampaignFileRow } from "@/components/admin/CampaignPrivateFileFanout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

type Campaign = {
  id: string;
  name: string;
  status: string;
  draft_count: number;
  failed_count: number;
  sent_count: number;
  created_at: string;
};

type MessageTarget = {
  id: string;
  lead_id: string;
  recipient_company: string;
  status: string;
};

type Props = {
  onPrepared: () => void;
};

export default function CampaignPrivateFileFanoutPanel({ onPrepared }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPreparedCount, setLastPreparedCount] = useState(0);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    const result = await db.from("outreach_campaigns")
      .select("id,name,status,draft_count,failed_count,sent_count,created_at")
      .gt("draft_count", 0)
      .order("created_at", { ascending: false })
      .limit(100);

    if (result.error) {
      setLoading(false);
      toast({ title: "Outreach campaigns could not load", description: result.error.message, variant: "destructive" });
      return;
    }
    const next = (result.data || []) as Campaign[];
    setCampaigns(next);
    setSelectedCampaignId((current) => current && next.some((campaign) => campaign.id === current) ? current : next[0]?.id || null);
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (campaignId: string | null) => {
    if (!campaignId) {
      setMessages([]);
      return;
    }
    const result = await db.from("outreach_messages")
      .select("id,lead_id,recipient_company,status")
      .eq("campaign_id", campaignId)
      .order("recipient_company", { ascending: true })
      .limit(1000);
    if (result.error) {
      setMessages([]);
      toast({ title: "Campaign drafts could not load", description: result.error.message, variant: "destructive" });
      return;
    }
    setMessages((result.data || []) as MessageTarget[]);
  }, []);

  useEffect(() => { void loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { void loadMessages(selectedCampaignId); }, [loadMessages, selectedCampaignId]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId],
  );

  const handleUploaded = (rows: CampaignFileRow[]) => {
    setLastPreparedCount(rows.length);
    onPrepared();
  };

  return (
    <section className="space-y-4 border border-border/60 bg-card/25 p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Large Batch 4 · Attachment preparation</p>
          <h2 className="mt-2 font-display text-2xl md:text-3xl">Campaign catalogue fan-out</h2>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-foreground/65">Choose a draft campaign, then upload one final catalogue or reference file. The system creates isolated private buyer copies with duplicate detection and rollback. Files become available inside each buyer's one-by-one draft review.</p>
        </div>
        <button type="button" onClick={() => void Promise.all([loadCampaigns(), loadMessages(selectedCampaignId)])} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-40"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh campaigns</button>
      </div>

      <label className="block max-w-2xl">
        <span className="mb-1.5 block text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Draft campaign</span>
        <select value={selectedCampaignId || ""} onChange={(event) => setSelectedCampaignId(event.target.value || null)} className="outreach-input">
          {!campaigns.length && <option value="">No campaign with drafts</option>}
          {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.draft_count} drafts · {campaign.failed_count} blocked</option>)}
        </select>
      </label>

      <CampaignPrivateFileFanout
        campaignId={selectedCampaignId}
        campaignName={selectedCampaign?.name || ""}
        messages={messages}
        onUploaded={handleUploaded}
      />

      {lastPreparedCount > 0 && <div className="border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-cyan-100">{lastPreparedCount} buyer-private file records are ready. Review each draft below, select the real file, then press <strong>Save draft</strong>. Approval remains pending.</div>}
      <div className="flex items-start gap-2 text-[10px] text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0" />This panel never calls email or WhatsApp providers and never changes a message to approved or sent.</div>
    </section>
  );
}
