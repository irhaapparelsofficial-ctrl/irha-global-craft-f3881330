import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Languages,
  Loader2,
  Mail,
  MessageSquareReply,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type OutreachStatus = "draft" | "generating" | "ready" | "sending" | "active" | "paused" | "completed" | "failed" | "cancelled";
type MessageStatus = "draft" | "approved" | "sending" | "sent" | "failed" | "rejected" | "suppressed" | "replied" | "unsubscribed" | "duplicate";

type Lead = {
  id: string;
  company_name: string;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  apparel_segment: string | null;
  buyer_type: string | null;
  crm_status: string | null;
  priority: string | null;
  verification_score: number | null;
  outreach_opt_out: boolean | null;
  last_outreach_at: string | null;
  last_outreach_status: string | null;
};

type Campaign = {
  id: string;
  name: string;
  product_focus: string[];
  target_market: string | null;
  objective: string;
  language_mode: string;
  call_to_action: string;
  status: OutreachStatus;
  selected_lead_count: number;
  draft_count: number;
  approved_count: number;
  sent_count: number;
  replied_count: number;
  failed_count: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type OutreachMessage = {
  id: string;
  campaign_id: string;
  lead_id: string;
  sequence_number: number;
  parent_message_id: string | null;
  recipient_email: string;
  recipient_company: string;
  language: string;
  subject: string;
  body_text: string;
  personalization_evidence: Record<string, unknown>;
  status: MessageStatus;
  gmail_message_id: string | null;
  gmail_thread_id: string | null;
  connector_response: Record<string, unknown>;
  sent_at: string | null;
  replied_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type Health = {
  ok?: boolean;
  database_ready?: boolean;
  ai_gateway_configured?: boolean;
  gmail_configured?: boolean;
  gmail_verified?: boolean;
  gmail_profile?: { emailAddress?: string | null } | null;
  gmail_error?: string | null;
  ready_to_generate?: boolean;
  ready_to_send?: boolean;
  limits?: { generate_per_request?: number; send_per_request?: number; reply_sync_per_request?: number };
  error?: string;
};

type CampaignDraft = {
  name: string;
  productFocus: string;
  targetMarket: string;
  objective: string;
  languageMode: string;
  callToAction: string;
};

type MessageEdit = { subject: string; body_text: string; language: string };

const emptyCampaign: CampaignDraft = {
  name: "",
  productFocus: "Lederhosen, Dirndl, Trachten wear",
  targetMarket: "Germany & Austria",
  objective: "Introduce Irha Apparels as an experienced B2B manufacturer and start a conversation about wholesale or private-label requirements.",
  languageMode: "auto",
  callToAction: "Reply with your product requirements or request a live factory video call.",
};

const campaignStyles: Record<OutreachStatus, string> = {
  draft: "border-border/60 text-muted-foreground",
  generating: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  ready: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  sending: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  active: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
  paused: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  completed: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  failed: "border-red-500/40 text-red-300 bg-red-500/10",
  cancelled: "border-slate-500/40 text-slate-300 bg-slate-500/10",
};

const messageStyles: Record<MessageStatus, string> = {
  draft: "border-border/60 text-muted-foreground",
  approved: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  sending: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  sent: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
  failed: "border-red-500/40 text-red-300 bg-red-500/10",
  rejected: "border-slate-500/40 text-slate-300 bg-slate-500/10",
  suppressed: "border-orange-500/40 text-orange-300 bg-orange-500/10",
  replied: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  unsubscribed: "border-purple-500/40 text-purple-300 bg-purple-500/10",
  duplicate: "border-slate-500/40 text-slate-300 bg-slate-500/10",
};

const db = supabase as any;

export default function MailingPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageEdits, setMessageEdits] = useState<Record<string, MessageEdit>>({});
  const [draft, setDraft] = useState<CampaignDraft>(emptyCampaign);
  const [leadQuery, setLeadQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [messageStatusFilter, setMessageStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [migrationReady, setMigrationReady] = useState(true);

  const loadHealth = async () => {
    const { data, error } = await supabase.functions.invoke("outreach-engine", { body: { action: "health" } });
    setHealth(error ? { error: error.message } : (data as Health));
  };

  const load = async (campaignId = selectedCampaignId) => {
    setLoading(true);
    const [leadResult, campaignResult, messageResult] = await Promise.all([
      db.from("b2b_leads").select("id,company_name,country,email,phone,website,apparel_segment,buyer_type,crm_status,priority,verification_score,outreach_opt_out,last_outreach_at,last_outreach_status").not("email", "is", null).order("updated_at", { ascending: false }).limit(1500),
      db.from("outreach_campaigns").select("*").order("created_at", { ascending: false }).limit(100),
      campaignId
        ? db.from("outreach_messages").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(1000)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const migrationError = [campaignResult.error, messageResult.error].find(isMigrationError);
    if (migrationError) {
      setMigrationReady(false);
      setCampaigns([]);
      setMessages([]);
    } else {
      setMigrationReady(true);
      if (campaignResult.error) toast({ title: "Outreach campaigns could not load", description: campaignResult.error.message, variant: "destructive" });
      if (messageResult.error) toast({ title: "Outreach messages could not load", description: messageResult.error.message, variant: "destructive" });
      const nextCampaigns = (campaignResult.data ?? []) as Campaign[];
      const nextMessages = ((messageResult.data ?? []) as OutreachMessage[]).map(normalizeMessage);
      setCampaigns(nextCampaigns);
      setMessages(nextMessages);
      setMessageEdits(Object.fromEntries(nextMessages.map((message) => [message.id, { subject: message.subject, body_text: message.body_text, language: message.language }])));
      if (!campaignId && nextCampaigns[0]?.id) {
        setSelectedCampaignId(nextCampaigns[0].id);
        setLoading(false);
        await load(nextCampaigns[0].id);
        return;
      }
    }
    if (leadResult.error) toast({ title: "Buyer leads could not load", description: leadResult.error.message, variant: "destructive" });
    setLeads(((leadResult.data ?? []) as Lead[]).filter((lead) => validEmail(lead.email)));
    setLoading(false);
  };

  useEffect(() => {
    void Promise.all([load(), loadHealth()]);
  }, []);

  const activeCampaign = useMemo(() => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null, [campaigns, selectedCampaignId]);
  const filteredLeads = useMemo(() => {
    const needle = leadQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      if (lead.outreach_opt_out) return false;
      if (!needle) return true;
      return [lead.company_name, lead.country, lead.email, lead.website, lead.apparel_segment, lead.buyer_type, lead.crm_status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [leadQuery, leads]);
  const filteredMessages = useMemo(() => {
    const needle = messageQuery.trim().toLowerCase();
    return messages.filter((message) => {
      if (messageStatusFilter && message.status !== messageStatusFilter) return false;
      if (!needle) return true;
      return [message.recipient_company, message.recipient_email, message.subject, message.body_text, message.language, message.status]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [messageQuery, messageStatusFilter, messages]);
  const messageStats = useMemo(() => ({
    total: messages.length,
    drafts: messages.filter((message) => message.status === "draft").length,
    approved: messages.filter((message) => message.status === "approved").length,
    sent: messages.filter((message) => ["sent", "replied"].includes(message.status)).length,
    replied: messages.filter((message) => message.status === "replied").length,
    failed: messages.filter((message) => message.status === "failed").length,
  }), [messages]);

  const generateCampaign = async () => {
    const leadIds = [...selectedLeadIds].slice(0, health?.limits?.generate_per_request ?? 50);
    if (leadIds.length === 0) {
      toast({ title: "Select at least one buyer lead", variant: "destructive" });
      return;
    }
    if (!health?.ready_to_generate) {
      toast({ title: "AI draft generation is not ready", description: health?.error || "Check database and AI Gateway health.", variant: "destructive" });
      return;
    }
    if (!draft.objective.trim()) {
      toast({ title: "Campaign objective is required", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Generate ${leadIds.length} personalized outreach draft${leadIds.length === 1 ? "" : "s"}? Nothing will be sent.`)) return;
    setBusy("generate");
    const { data, error } = await supabase.functions.invoke("outreach-engine", {
      body: {
        action: "generate",
        lead_ids: leadIds,
        campaign: {
          name: draft.name,
          product_focus: splitList(draft.productFocus),
          target_market: draft.targetMarket,
          objective: draft.objective,
          language_mode: draft.languageMode,
          call_to_action: draft.callToAction,
        },
      },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Draft generation failed", description: data?.error || error?.message || "No usable drafts returned", variant: "destructive" });
      return;
    }
    setDraft(emptyCampaign);
    setSelectedLeadIds(new Set());
    setSelectedCampaignId(data.campaign_id);
    toast({ title: "Personalized drafts created", description: `${data.created ?? 0} created · ${data.suppressed ?? 0} suppressed. Nothing was sent.` });
    await load(data.campaign_id);
  };

  const saveMessage = async (message: OutreachMessage, status: "draft" | "approved" | "rejected" = "draft") => {
    const edit = messageEdits[message.id];
    if (!edit?.subject.trim() || !edit?.body_text.trim()) {
      toast({ title: "Subject and body are required", variant: "destructive" });
      return;
    }
    setBusy(`save:${message.id}`);
    const { data, error } = await supabase.functions.invoke("outreach-engine", {
      body: { action: "update", message_id: message.id, subject: edit.subject, body_text: edit.body_text, language: edit.language, status },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Draft update failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    setEditingMessageId(null);
    toast({ title: status === "approved" ? "Draft approved" : status === "rejected" ? "Draft rejected" : "Draft saved" });
    await load(selectedCampaignId);
  };

  const sendSelected = async () => {
    const maxSend = health?.limits?.send_per_request ?? 10;
    const ids = [...selectedMessageIds].filter((id) => {
      const status = messages.find((message) => message.id === id)?.status;
      return status === "draft" || status === "approved" || status === "failed";
    }).slice(0, maxSend);
    if (ids.length === 0) {
      toast({ title: "Select draft, approved or failed messages", variant: "destructive" });
      return;
    }
    if (!health?.ready_to_send) {
      toast({ title: "Gmail sending is not ready", description: health?.gmail_error || "Check Gmail connector runtime health.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Approve and send ${ids.length} one-to-one Gmail message${ids.length === 1 ? "" : "s"}? Sending is irreversible.`)) return;
    setBusy("send");
    const { data, error } = await supabase.functions.invoke("outreach-engine", { body: { action: "send", message_ids: ids } });
    setBusy(null);
    if (error) {
      toast({ title: "Gmail send request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: data?.ok ? "Gmail send completed" : "No message was sent", description: summarizeObject(data?.summary) || data?.error || "Exact outcomes saved." , variant: data?.ok ? "default" : "destructive" });
    setSelectedMessageIds(new Set());
    await Promise.all([load(selectedCampaignId), loadHealth()]);
  };

  const syncReplies = async () => {
    if (!selectedCampaignId) return;
    if (!health?.ready_to_send) {
      toast({ title: "Gmail reply sync is not ready", description: health?.gmail_error || "Check Gmail connector runtime health.", variant: "destructive" });
      return;
    }
    setBusy("sync");
    const { data, error } = await supabase.functions.invoke("outreach-engine", { body: { action: "sync_replies", campaign_id: selectedCampaignId } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Reply sync failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Gmail replies checked", description: summarizeObject(data.summary) });
    await load(selectedCampaignId);
  };

  const generateFollowUps = async () => {
    if (!selectedCampaignId) return;
    if (!health?.ready_to_generate) {
      toast({ title: "AI follow-up generation is not ready", variant: "destructive" });
      return;
    }
    if (!window.confirm("Generate first follow-up drafts for sent messages older than 5 days with no detected reply? Nothing will be sent.")) return;
    setBusy("followup");
    const { data, error } = await supabase.functions.invoke("outreach-engine", { body: { action: "generate_followups", campaign_id: selectedCampaignId, minimum_days: 5 } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Follow-up generation failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Follow-up drafts prepared", description: `${data.created ?? 0} created. Nothing was sent.` });
    await load(selectedCampaignId);
  };

  const selectCampaign = async (id: string) => {
    setSelectedCampaignId(id);
    setSelectedMessageIds(new Set());
    setExpandedMessageId(null);
    setEditingMessageId(null);
    await load(id);
  };

  const toggleLead = (id: string) => setSelectedLeadIds((current) => toggleSet(current, id));
  const toggleMessage = (id: string) => setSelectedMessageIds((current) => toggleSet(current, id));

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold mb-3"><Mail size={15} /> AI Outreach & Follow-ups</div>
            <h2 className="font-display text-3xl md:text-4xl">Buyer Outreach Workspace</h2>
            <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
              Creates evidence-based one-to-one drafts from Buyer CRM, keeps sending behind explicit approval, records exact Gmail message/thread IDs, detects replies in the same thread, and suppresses opt-outs before future sends.
            </p>
          </div>
          <button type="button" onClick={() => void Promise.all([load(selectedCampaignId), loadHealth()])} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>
      </section>

      <HealthBanner health={health} migrationReady={migrationReady} />

      <div className="grid xl:grid-cols-12 gap-6">
        <section className="xl:col-span-4 space-y-5">
          <div className="border border-border/60 bg-card/30 p-5">
            <p className="eyebrow mb-2">Campaign brief</p>
            <div className="space-y-3">
              <Field label="Campaign name"><input className="outreach-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="DACH Trachten outreach" /></Field>
              <Field label="Product focus"><textarea rows={2} className="outreach-input resize-y" value={draft.productFocus} onChange={(event) => setDraft((current) => ({ ...current, productFocus: event.target.value }))} /></Field>
              <Field label="Target market"><input className="outreach-input" value={draft.targetMarket} onChange={(event) => setDraft((current) => ({ ...current, targetMarket: event.target.value }))} /></Field>
              <Field label="Objective *"><textarea rows={4} className="outreach-input resize-y" value={draft.objective} onChange={(event) => setDraft((current) => ({ ...current, objective: event.target.value }))} /></Field>
              <Field label="Language"><select className="outreach-input" value={draft.languageMode} onChange={(event) => setDraft((current) => ({ ...current, languageMode: event.target.value }))}><option value="auto">Auto by market</option><option value="English">English</option><option value="German">German</option><option value="French">French</option><option value="Italian">Italian</option><option value="Spanish">Spanish</option></select></Field>
              <Field label="Call to action"><textarea rows={2} className="outreach-input resize-y" value={draft.callToAction} onChange={(event) => setDraft((current) => ({ ...current, callToAction: event.target.value }))} /></Field>
            </div>
          </div>

          <div className="border border-border/60 bg-card/30 p-5">
            <div className="flex items-center justify-between gap-3 mb-3"><p className="eyebrow">Select CRM buyers</p><span className="text-[10px] text-gold">{selectedLeadIds.size} selected</span></div>
            <div className="flex items-center gap-2 border border-border/60 bg-background/30 px-3 py-2 mb-3"><Search size={12} className="text-muted-foreground" /><input value={leadQuery} onChange={(event) => setLeadQuery(event.target.value)} placeholder="Search verified buyers…" className="bg-transparent outline-none text-xs w-full" /></div>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => setSelectedLeadIds(new Set(filteredLeads.slice(0, health?.limits?.generate_per_request ?? 50).map((lead) => lead.id)))} className="text-[9px] uppercase tracking-[0.14em] text-gold">Select visible</button>
              <button type="button" onClick={() => setSelectedLeadIds(new Set())} className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Clear</button>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredLeads.length === 0 && <p className="text-xs text-muted-foreground py-5 text-center">No eligible buyer emails found.</p>}
              {filteredLeads.map((lead) => (
                <label key={lead.id} className={`block border p-3 cursor-pointer ${selectedLeadIds.has(lead.id) ? "border-gold/70 bg-gold/5" : "border-border/50 bg-background/20"}`}>
                  <div className="flex items-start gap-3"><input type="checkbox" checked={selectedLeadIds.has(lead.id)} onChange={() => toggleLead(lead.id)} className="mt-1" /><div className="min-w-0"><p className="text-sm font-medium truncate">{lead.company_name}</p><p className="text-[10px] text-gold truncate mt-1">{lead.email}</p><p className="text-[9px] text-muted-foreground mt-1">{lead.country} · {lead.buyer_type || lead.apparel_segment || "Buyer type not set"} · score {lead.verification_score ?? "—"}</p>{lead.last_outreach_status && <p className="text-[9px] text-cyan-300 mt-1">Last outreach: {lead.last_outreach_status}</p>}</div></div>
                </label>
              ))}
            </div>
            <button type="button" onClick={() => void generateCampaign()} disabled={busy !== null || selectedLeadIds.size === 0 || !migrationReady} className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40">{busy === "generate" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate drafts only</button>
          </div>

          <div className="border border-border/60 bg-card/30 p-4">
            <div className="flex items-center justify-between gap-3 mb-3"><p className="eyebrow">Campaigns</p><span className="text-[10px] text-muted-foreground">{campaigns.length}</span></div>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {campaigns.length === 0 && <p className="text-xs text-muted-foreground py-5 text-center">No outreach campaigns yet.</p>}
              {campaigns.map((campaign) => (
                <button key={campaign.id} type="button" onClick={() => void selectCampaign(campaign.id)} className={`w-full text-left border p-3 ${selectedCampaignId === campaign.id ? "border-gold/70 bg-gold/5" : "border-border/50 bg-background/20"}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-display text-lg truncate">{campaign.name}</p><p className="text-[9px] text-muted-foreground mt-1">{new Date(campaign.created_at).toLocaleString()}</p></div><Badge className={campaignStyles[campaign.status]}>{campaign.status}</Badge></div>
                  <div className="grid grid-cols-3 gap-2 mt-3"><MiniMetric label="Drafts" value={campaign.draft_count} /><MiniMetric label="Sent" value={campaign.sent_count} /><MiniMetric label="Replies" value={campaign.replied_count} /></div>
                  {campaign.error && <p className="text-[9px] text-destructive mt-2 line-clamp-2">{campaign.error}</p>}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="xl:col-span-8 space-y-5">
          {!activeCampaign ? (
            <EmptyState icon={<Mail size={28} />} title="Select or create a campaign" body="Personalized drafts, approval controls and Gmail results will appear here." />
          ) : (
            <>
              <div className="border border-border/60 bg-card/30 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap"><div><div className="flex flex-wrap items-center gap-2"><Badge className={campaignStyles[activeCampaign.status]}>{activeCampaign.status}</Badge><span className="text-[10px] text-muted-foreground">{activeCampaign.language_mode} language</span></div><h3 className="font-display text-2xl mt-2">{activeCampaign.name}</h3><p className="text-xs text-foreground/60 mt-2 max-w-3xl">{activeCampaign.objective}</p></div><div className="flex gap-2 flex-wrap"><button type="button" onClick={() => void generateFollowUps()} disabled={busy !== null} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-[9px] uppercase tracking-[0.15em] hover:border-gold hover:text-gold disabled:opacity-40">{busy === "followup" ? <Loader2 size={11} className="animate-spin" /> : <MessageSquareReply size={11} />} Prepare follow-ups</button><button type="button" onClick={() => void syncReplies()} disabled={busy !== null} className="inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-[9px] uppercase tracking-[0.15em] hover:border-gold hover:text-gold disabled:opacity-40">{busy === "sync" ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Sync Gmail replies</button></div></div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><Metric label="Messages" value={messageStats.total} /><Metric label="Drafts" value={messageStats.drafts} /><Metric label="Approved" value={messageStats.approved} /><Metric label="Sent" value={messageStats.sent} /><Metric label="Replies" value={messageStats.replied} /><Metric label="Failed" value={messageStats.failed} /></div>

              <div className="flex flex-wrap items-center gap-3"><div className="flex items-center gap-2 border border-border/60 bg-card/30 px-3 py-2.5 flex-1 min-w-[240px]"><Search size={13} className="text-muted-foreground" /><input value={messageQuery} onChange={(event) => setMessageQuery(event.target.value)} placeholder="Search company, email, subject or message…" className="bg-transparent outline-none text-xs w-full" /></div><select value={messageStatusFilter} onChange={(event) => setMessageStatusFilter(event.target.value)} className="border border-border/60 bg-card/30 px-3 py-2.5 text-xs"><option value="">All statuses</option>{Object.keys(messageStyles).map((status) => <option key={status} value={status}>{status}</option>)}</select></div>

              {selectedMessageIds.size > 0 && <div className="border border-gold/40 bg-gold/5 p-3 flex items-center justify-between gap-3 flex-wrap"><span className="text-xs text-gold">{selectedMessageIds.size} selected</span><button type="button" onClick={() => void sendSelected()} disabled={busy !== null || !health?.ready_to_send} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">{busy === "send" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Approve & send selected</button></div>}

              <div className="space-y-3">
                {loading && <p className="text-sm text-muted-foreground py-10 text-center">Loading outreach messages…</p>}
                {!loading && filteredMessages.length === 0 && <EmptyState icon={<MessageSquareReply size={24} />} title="No messages in this view" body="Generate drafts or change the filters." />}
                {filteredMessages.map((message) => {
                  const edit = messageEdits[message.id] || { subject: message.subject, body_text: message.body_text, language: message.language };
                  const editable = ["draft", "approved", "failed", "rejected"].includes(message.status);
                  const isEditing = editingMessageId === message.id;
                  const selectable = ["draft", "approved", "failed"].includes(message.status);
                  return (
                    <article key={message.id} className={`border p-5 ${selectedMessageIds.has(message.id) ? "border-gold/70 bg-gold/5" : "border-border/60 bg-card/30"}`}>
                      <div className="flex items-start gap-3"><input type="checkbox" checked={selectedMessageIds.has(message.id)} onChange={() => toggleMessage(message.id)} disabled={!selectable} className="mt-1" /><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-4 flex-wrap"><div><div className="flex flex-wrap items-center gap-2"><Badge className={messageStyles[message.status]}>{message.status}</Badge><span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{message.sequence_number === 0 ? "Initial" : `Follow-up ${message.sequence_number}`}</span><span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground"><Languages size={10} /> {message.language}</span></div><h4 className="font-display text-xl mt-2">{message.recipient_company}</h4><p className="text-[10px] text-gold mt-1">{message.recipient_email}</p></div><div className="flex gap-2">{editable && <button type="button" onClick={() => setEditingMessageId(isEditing ? null : message.id)} className="p-2 text-muted-foreground hover:text-gold" aria-label="Edit draft"><Pencil size={13} /></button>}<button type="button" onClick={() => void copyText(`${edit.subject}\n\n${edit.body_text}`)} className="p-2 text-muted-foreground hover:text-gold" aria-label="Copy draft"><Copy size={13} /></button><button type="button" onClick={() => setExpandedMessageId((current) => current === message.id ? null : message.id)} className="p-2 text-muted-foreground hover:text-gold" aria-label="Toggle evidence">{expandedMessageId === message.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button></div></div>

                        {isEditing ? <div className="mt-4 space-y-3"><Field label="Language"><input className="outreach-input" value={edit.language} onChange={(event) => updateEdit(setMessageEdits, message.id, { language: event.target.value })} /></Field><Field label="Subject"><input className="outreach-input" value={edit.subject} onChange={(event) => updateEdit(setMessageEdits, message.id, { subject: event.target.value })} /></Field><Field label="Body"><textarea rows={8} className="outreach-input resize-y" value={edit.body_text} onChange={(event) => updateEdit(setMessageEdits, message.id, { body_text: event.target.value })} /></Field><div className="flex gap-2 flex-wrap"><button type="button" onClick={() => void saveMessage(message, "draft")} disabled={busy !== null} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2 text-[9px] uppercase tracking-[0.16em]"><Save size={11} /> Save draft</button><button type="button" onClick={() => void saveMessage(message, "approved")} disabled={busy !== null} className="inline-flex items-center gap-2 border border-emerald-500/50 text-emerald-300 px-4 py-2 text-[9px] uppercase tracking-[0.16em]"><UserCheck size={11} /> Approve</button><button type="button" onClick={() => void saveMessage(message, "rejected")} disabled={busy !== null} className="inline-flex items-center gap-2 border border-red-500/50 text-red-300 px-4 py-2 text-[9px] uppercase tracking-[0.16em]"><XCircle size={11} /> Reject</button></div></div> : <><p className="text-sm font-medium mt-4">{message.subject}</p><p className="text-sm text-foreground/75 whitespace-pre-wrap leading-relaxed mt-3">{message.body_text}</p></>}

                        {(message.gmail_message_id || message.gmail_thread_id || message.sent_at || message.replied_at) && <div className="flex flex-wrap gap-3 mt-4 text-[10px] text-muted-foreground">{message.sent_at && <span>Sent {new Date(message.sent_at).toLocaleString()}</span>}{message.replied_at && <span className="text-emerald-300">Reply {new Date(message.replied_at).toLocaleString()}</span>}{message.gmail_message_id && <span>Gmail msg {message.gmail_message_id}</span>}{message.gmail_thread_id && <a href={`https://mail.google.com/mail/u/0/#all/${message.gmail_thread_id}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">Open Gmail thread <ExternalLink size={9} /></a>}</div>}
                        {message.error && <p className="text-xs text-destructive mt-3">{message.error}</p>}
                        {expandedMessageId === message.id && <div className="mt-4 border-t border-border/40 pt-4"><p className="text-[9px] uppercase tracking-[0.18em] text-gold mb-2">Personalization evidence & exact connector result</p><pre className="text-[10px] whitespace-pre-wrap break-words border border-border/40 bg-background/30 p-3 max-h-64 overflow-auto">{JSON.stringify({ personalization: message.personalization_evidence, connector_response: message.connector_response }, null, 2)}</pre></div>}
                      </div></div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <style>{`.outreach-input{width:100%;background:hsl(var(--input));border:1px solid hsl(var(--border));padding:.65rem .75rem;font-size:.75rem;outline:none}.outreach-input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function HealthBanner({ health, migrationReady }: { health: Health | null; migrationReady: boolean }) {
  if (!migrationReady) return <div className="border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3"><AlertTriangle size={18} className="text-amber-300 shrink-0" /><div><p className="font-medium">Outreach database migration pending</p><p className="text-xs text-foreground/65 mt-1">Publish/apply the latest migration before creating outreach campaigns.</p></div></div>;
  if (!health) return <div className="border border-border/60 bg-card/30 p-4 text-xs text-muted-foreground">Checking AI and Gmail runtime…</div>;
  if (health.error) return <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{health.error}</div>;
  return <div className={`border p-4 flex items-start gap-3 ${health.ready_to_send ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>{health.ready_to_send ? <CheckCircle2 size={17} className="text-emerald-300 shrink-0" /> : <AlertTriangle size={17} className="text-amber-300 shrink-0" />}<div className="flex-1"><p className="font-medium text-sm">{health.ready_to_send ? `Gmail outreach ready${health.gmail_profile?.emailAddress ? ` · ${health.gmail_profile.emailAddress}` : ""}` : health.ready_to_generate ? "AI drafts ready; Gmail sending not verified" : "Outreach needs configuration"}</p><p className="text-xs text-foreground/65 mt-1">{health.gmail_error || "Sending remains behind an explicit owner confirmation and is capped per request."}</p><div className="flex flex-wrap gap-2 mt-3"><HealthFlag label="Database" active={Boolean(health.database_ready)} /><HealthFlag label="AI Gateway" active={Boolean(health.ai_gateway_configured)} /><HealthFlag label="Gmail configured" active={Boolean(health.gmail_configured)} /><HealthFlag label="Gmail verified" active={Boolean(health.gmail_verified)} /></div></div></div>;
}

function HealthFlag({ label, active }: { label: string; active: boolean }) { return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${active ? "border-emerald-500/40 text-emerald-300" : "border-border/60 text-muted-foreground"}`}>{label}</span>; }
function Badge({ children, className }: { children: ReactNode; className: string }) { return <span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${className}`}>{children}</span>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="border border-border/60 bg-card/30 p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>; }
function MiniMetric({ label, value }: { label: string; value: number }) { return <div className="border border-border/40 bg-background/20 p-2 text-center"><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="font-display text-base mt-0.5">{value}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}</span>{children}</label>; }
function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) { return <div className="border border-dashed border-border/60 bg-card/20 p-12 text-center"><div className="inline-flex text-muted-foreground mb-3">{icon}</div><h3 className="font-display text-xl">{title}</h3><p className="text-sm text-muted-foreground mt-2">{body}</p></div>; }
function normalizeMessage(message: OutreachMessage): OutreachMessage { return { ...message, personalization_evidence: message.personalization_evidence && typeof message.personalization_evidence === "object" ? message.personalization_evidence : {}, connector_response: message.connector_response && typeof message.connector_response === "object" ? message.connector_response : {} }; }
function splitList(value: string) { return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))]; }
function validEmail(value: string | null) { return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)); }
function toggleSet(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }
function updateEdit(setter: React.Dispatch<React.SetStateAction<Record<string, MessageEdit>>>, id: string, patch: Partial<MessageEdit>) { setter((current) => ({ ...current, [id]: { ...current[id], ...patch } })); }
function isMigrationError(error: any) { const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase(); return text.includes("42p01") || text.includes("outreach_campaigns") || text.includes("outreach_messages"); }
function summarizeObject(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) return ""; return Object.entries(value as Record<string, unknown>).map(([key, count]) => `${String(count)} ${key.replace(/_/g, " ")}`).join(" · "); }
async function copyText(value: string) { await navigator.clipboard.writeText(value); toast({ title: "Draft copied" }); }
