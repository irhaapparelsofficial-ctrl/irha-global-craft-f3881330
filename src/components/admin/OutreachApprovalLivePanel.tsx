import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

type Channel = "email" | "whatsapp";
type Lead = {
  id: string;
  company_name: string;
  country: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  apparel_segment: string | null;
  buyer_type: string | null;
  crm_status: string | null;
  verification_score: number | null;
  outreach_opt_out: boolean | null;
  last_outreach_status: string | null;
};
type Campaign = {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  replied_count: number;
  failed_count: number;
  created_at: string;
};
type OutreachMessage = {
  id: string;
  campaign_id: string;
  lead_id: string;
  channel: Channel;
  recipient_email: string | null;
  recipient_whatsapp: string | null;
  recipient_company: string;
  language: string;
  subject: string;
  body_text: string;
  status: string;
  sent_at: string | null;
  manual_reason: string | null;
  error: string | null;
};
type Health = {
  database_ready?: boolean;
  ai_ready?: boolean;
  gmail_ready?: boolean;
  whatsapp_ready?: boolean;
  error?: string;
};
type MessageEdit = { channel: Channel; subject: string; body: string; language: string };
type CampaignForm = {
  name: string;
  productFocus: string;
  targetMarket: string;
  objective: string;
  language: string;
  cta: string;
  preferredChannel: "auto" | Channel;
};

const ELIGIBLE = new Set(["qualified", "contacted", "replied", "sample_requested", "quote_requested", "quotation_sent", "negotiation", "follow_up"]);
const emptyCampaign: CampaignForm = {
  name: "",
  productFocus: "Private-label apparel",
  targetMarket: "",
  objective: "Introduce Irha Apparels as an experienced B2B manufacturer and start a conversation about the buyer's wholesale or private-label requirements.",
  language: "auto",
  cta: "Reply with your product requirements or request a scheduled live factory video call.",
  preferredChannel: "auto",
};

export default function OutreachApprovalLivePanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, MessageEdit>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [leadQuery, setLeadQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [form, setForm] = useState<CampaignForm>(emptyCampaign);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadHealth = async () => {
    const { data, error } = await supabase.functions.invoke("outreach-workflow-v2", { body: { action: "health" } });
    setHealth(error ? { error: error.message } : data as Health);
  };

  const load = async (campaignId = selectedCampaignId) => {
    setLoading(true);
    const [leadResult, campaignResult] = await Promise.all([
      db.from("b2b_leads")
        .select("id,company_name,country,email,phone,whatsapp,website,apparel_segment,buyer_type,crm_status,verification_score,outreach_opt_out,last_outreach_status")
        .order("updated_at", { ascending: false })
        .limit(2000),
      db.from("outreach_campaigns").select("id,name,status,sent_count,replied_count,failed_count,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (leadResult.error) toast({ title: "Buyer leads could not load", description: leadResult.error.message, variant: "destructive" });
    if (campaignResult.error) toast({ title: "Campaigns could not load", description: campaignResult.error.message, variant: "destructive" });

    setLeads(((leadResult.data || []) as Lead[]).filter((lead) => !lead.outreach_opt_out && isEligible(lead) && Boolean(validEmail(lead.email) || normalizePhone(lead.whatsapp || lead.phone))));
    const nextCampaigns = (campaignResult.data || []) as Campaign[];
    setCampaigns(nextCampaigns);
    let target = campaignId;
    if (!target && nextCampaigns[0]?.id) target = nextCampaigns[0].id;
    if (target) {
      const messageResult = await db.from("outreach_messages").select("id,campaign_id,lead_id,channel,recipient_email,recipient_whatsapp,recipient_company,language,subject,body_text,status,sent_at,manual_reason,error").eq("campaign_id", target).order("created_at", { ascending: true }).limit(1000);
      if (messageResult.error) {
        toast({ title: "Drafts could not load", description: messageResult.error.message, variant: "destructive" });
        setMessages([]);
      } else {
        const nextMessages = (messageResult.data || []) as OutreachMessage[];
        setMessages(nextMessages);
        setEdits(Object.fromEntries(nextMessages.map((message) => [message.id, {
          channel: message.channel || "email",
          subject: message.subject,
          body: message.body_text,
          language: message.language,
        }])));
      }
      setSelectedCampaignId(target);
    } else {
      setMessages([]);
      setSelectedCampaignId(null);
    }
    setLoading(false);
  };

  useEffect(() => { void Promise.all([load(), loadHealth()]); }, []);

  const filteredLeads = useMemo(() => {
    const needle = leadQuery.trim().toLowerCase();
    return leads.filter((lead) => !needle || [lead.company_name, lead.country, lead.email, lead.whatsapp, lead.phone, lead.website, lead.apparel_segment, lead.buyer_type].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [leadQuery, leads]);
  const filteredMessages = useMemo(() => {
    const needle = messageQuery.trim().toLowerCase();
    return messages.filter((message) => !needle || [message.recipient_company, message.recipient_email, message.recipient_whatsapp, message.subject, message.body_text, message.channel, message.status].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [messageQuery, messages]);
  const activeCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;

  const generateDrafts = async () => {
    const ids = [...selectedLeadIds].slice(0, 50);
    if (!ids.length) { toast({ title: "Select at least one eligible buyer", variant: "destructive" }); return; }
    if (!health?.ai_ready) { toast({ title: "AI drafting is not ready", description: health?.error || "Check backend health.", variant: "destructive" }); return; }
    if (!form.objective.trim()) { toast({ title: "Campaign objective is required", variant: "destructive" }); return; }
    if (!window.confirm(`Generate ${ids.length} personalized draft${ids.length === 1 ? "" : "s"}? Nothing will be approved or sent.`)) return;

    setBusy("generate");
    const { data, error } = await supabase.functions.invoke("outreach-workflow-v2", {
      body: {
        action: "generate",
        lead_ids: ids,
        preferred_channel: form.preferredChannel,
        campaign: {
          name: form.name,
          product_focus: splitList(form.productFocus),
          target_market: form.targetMarket,
          objective: form.objective,
          language_mode: form.language,
          call_to_action: form.cta,
        },
      },
    });
    setBusy(null);
    if (error || data?.ok !== true) {
      toast({ title: "Draft generation failed", description: data?.error || error?.message || "No draft was created", variant: "destructive" });
      return;
    }
    setSelectedLeadIds(new Set());
    setForm(emptyCampaign);
    setSelectedCampaignId(data.campaign_id);
    toast({ title: "Personalized drafts created", description: `${data.created || 0} drafts prepared. Nothing was sent.` });
    await load(data.campaign_id);
  };

  const saveDraft = async (message: OutreachMessage) => {
    const edit = edits[message.id];
    if (!edit?.subject.trim() || !edit.body.trim()) { toast({ title: "Subject and message are required", variant: "destructive" }); return false; }
    const { data, error } = await supabase.functions.invoke("outreach-workflow-v2", {
      body: {
        action: "update",
        message_id: message.id,
        channel: edit.channel,
        subject: edit.subject,
        body_text: edit.body,
        language: edit.language,
      },
    });
    if (error || data?.ok !== true) {
      toast({ title: "Draft update failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return false;
    }
    return true;
  };

  const saveOnly = async (message: OutreachMessage) => {
    setBusy(`save:${message.id}`);
    const saved = await saveDraft(message);
    setBusy(null);
    if (!saved) return;
    toast({ title: "Draft saved", description: "Approval is still pending. Nothing was sent." });
    await load(selectedCampaignId);
  };

  const approveAndSend = async (message: OutreachMessage) => {
    const edit = edits[message.id];
    if (!edit) return;
    const route = edit.channel === "email" ? "email" : "WhatsApp message";
    if (!window.confirm(`Approve and send this ${route} to ${message.recipient_company}? The provider send is irreversible after acceptance.`)) return;
    setBusy(`send:${message.id}`);

    const saved = await saveDraft(message);
    if (!saved) { setBusy(null); return; }

    const approval = await supabase.functions.invoke("outreach-workflow-v2", {
      body: { action: "approve", message_id: message.id },
    });
    if (approval.data?.status === "manual_required") {
      setBusy(null);
      toast({ title: "Manual action required", description: approval.data.reason || "Approval rules blocked provider dispatch.", variant: "destructive" });
      await load(selectedCampaignId);
      return;
    }
    if (approval.error || approval.data?.ok !== true) {
      setBusy(null);
      toast({ title: "Approval failed", description: approval.data?.error || approval.error?.message || "Unknown error", variant: "destructive" });
      await load(selectedCampaignId);
      return;
    }

    if (approval.data.channel === "email") {
      const provider = await supabase.functions.invoke("outreach-engine", {
        body: { action: "send", message_ids: [message.id] },
      });
      setBusy(null);
      if (provider.error || provider.data?.ok !== true) {
        toast({ title: "Email send failed safely", description: provider.data?.error || provider.error?.message || summarize(provider.data?.summary) || "Exact outcome was saved.", variant: "destructive" });
      } else {
        toast({ title: "Email sent", description: summarize(provider.data?.summary) || "Gmail accepted the owner-approved message." });
      }
      await Promise.all([load(selectedCampaignId), loadHealth()]);
      return;
    }

    const whatsappMessageId = approval.data.whatsapp_message_id;
    const provider = await supabase.functions.invoke("whatsapp-admin", {
      body: { action: "send_approved", message_id: whatsappMessageId },
    });
    const providerReason = provider.data?.error || provider.error?.message || null;
    const finalized = await supabase.functions.invoke("outreach-workflow-v2", {
      body: {
        action: "finalize_whatsapp",
        message_id: message.id,
        provider_error: providerReason,
      },
    });
    setBusy(null);
    if (finalized.data?.status === "manual_required") {
      toast({ title: "WhatsApp manual action required", description: finalized.data.reason || providerReason || "Provider rules blocked automatic sending.", variant: "destructive" });
    } else if (provider.error || provider.data?.ok !== true || finalized.error || finalized.data?.ok !== true) {
      toast({ title: "WhatsApp send failed safely", description: finalized.data?.error || providerReason || finalized.error?.message || "Exact outcome was saved.", variant: "destructive" });
    } else {
      toast({ title: "WhatsApp message sent", description: "Meta accepted the one owner-approved message." });
    }
    await Promise.all([load(selectedCampaignId), loadHealth()]);
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold"><ShieldCheck size={15} /> Owner-approved outreach</div>
            <h2 className="font-display text-3xl md:text-4xl">Upload → Draft → Review → Approve & Send</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">Lead workbooks are retained privately and candidates are activated separately. AI prepares one truthful email or WhatsApp draft per eligible buyer. Only your button press sends one message.</p>
          </div>
          <button type="button" onClick={() => void Promise.all([load(selectedCampaignId), loadHealth()])} className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>
      </section>

      <HealthStrip health={health} />

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="space-y-5 xl:col-span-4">
          <div className="border border-border/60 bg-card/30 p-5">
            <p className="eyebrow mb-3">Campaign brief</p>
            <div className="space-y-3">
              <Field label="Campaign name"><input className="outreach-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Switzerland nightwear outreach" /></Field>
              <Field label="Product focus"><textarea rows={2} className="outreach-input resize-y" value={form.productFocus} onChange={(event) => setForm((current) => ({ ...current, productFocus: event.target.value }))} /></Field>
              <Field label="Target market"><input className="outreach-input" value={form.targetMarket} onChange={(event) => setForm((current) => ({ ...current, targetMarket: event.target.value }))} /></Field>
              <Field label="Objective"><textarea rows={4} className="outreach-input resize-y" value={form.objective} onChange={(event) => setForm((current) => ({ ...current, objective: event.target.value }))} /></Field>
              <Field label="Preferred route"><select className="outreach-input" value={form.preferredChannel} onChange={(event) => setForm((current) => ({ ...current, preferredChannel: event.target.value as CampaignForm["preferredChannel"] }))}><option value="auto">Auto: email first, WhatsApp fallback</option><option value="email">Prefer email</option><option value="whatsapp">Prefer WhatsApp</option></select></Field>
              <Field label="Language"><select className="outreach-input" value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}><option value="auto">Auto by market</option><option>English</option><option>German</option><option>French</option><option>Italian</option><option>Spanish</option></select></Field>
              <Field label="Call to action"><textarea rows={2} className="outreach-input resize-y" value={form.cta} onChange={(event) => setForm((current) => ({ ...current, cta: event.target.value }))} /></Field>
            </div>
          </div>

          <div className="border border-border/60 bg-card/30 p-5">
            <div className="mb-3 flex items-center justify-between gap-3"><p className="eyebrow">Eligible CRM buyers</p><span className="text-[10px] text-gold">{selectedLeadIds.size} selected</span></div>
            <div className="mb-3 flex items-center gap-2 border border-border/60 bg-background/30 px-3 py-2"><Search size={12} className="text-muted-foreground" /><input value={leadQuery} onChange={(event) => setLeadQuery(event.target.value)} placeholder="Search buyer…" className="w-full bg-transparent text-xs outline-none" /></div>
            <div className="mb-3 flex gap-3 text-[9px] uppercase tracking-[0.14em]"><button type="button" className="text-gold" onClick={() => setSelectedLeadIds(new Set(filteredLeads.slice(0, 50).map((lead) => lead.id)))}>Select visible</button><button type="button" className="text-muted-foreground" onClick={() => setSelectedLeadIds(new Set())}>Clear</button></div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {!filteredLeads.length && <p className="py-5 text-center text-xs text-muted-foreground">No eligible buyer with a verified email or WhatsApp route.</p>}
              {filteredLeads.map((lead) => (
                <label key={lead.id} className={`block cursor-pointer border p-3 ${selectedLeadIds.has(lead.id) ? "border-gold/70 bg-gold/5" : "border-border/50 bg-background/20"}`}>
                  <div className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={selectedLeadIds.has(lead.id)} onChange={() => setSelectedLeadIds((current) => toggleSet(current, lead.id))} /><div className="min-w-0"><p className="truncate text-sm font-medium">{lead.company_name}</p><p className="mt-1 truncate text-[10px] text-gold">{validEmail(lead.email) || normalizePhone(lead.whatsapp || lead.phone)}</p><p className="mt-1 text-[9px] text-muted-foreground">{lead.country} · {validEmail(lead.email) ? "Email" : "WhatsApp"} · score {lead.verification_score ?? "—"} · {lead.crm_status}</p>{lead.last_outreach_status && <p className="mt-1 text-[9px] text-cyan-300">Last: {lead.last_outreach_status}</p>}</div></div>
                </label>
              ))}
            </div>
            <button type="button" onClick={() => void generateDrafts()} disabled={busy !== null || !selectedLeadIds.size || !health?.ai_ready} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-gradient-gold px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-40">{busy === "generate" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate drafts only</button>
          </div>

          <div className="border border-border/60 bg-card/30 p-4">
            <p className="eyebrow mb-3">Campaigns</p>
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {campaigns.map((campaign) => <button type="button" key={campaign.id} onClick={() => void load(campaign.id)} className={`w-full border p-3 text-left ${selectedCampaignId === campaign.id ? "border-gold/70 bg-gold/5" : "border-border/50"}`}><p className="truncate text-xs font-medium">{campaign.name}</p><p className="mt-1 text-[9px] text-muted-foreground">{campaign.status} · {campaign.sent_count} sent · {campaign.replied_count} replied · {campaign.failed_count} blocked/failed</p></button>)}
            </div>
          </div>
        </section>

        <section className="space-y-4 xl:col-span-8">
          <div className="border border-border/60 bg-card/30 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">One-by-one review</p><h3 className="mt-1 font-display text-2xl">{activeCampaign?.name || "Select a campaign"}</h3></div><div className="flex items-center gap-2 border border-border/60 px-3 py-2"><Search size={12} className="text-muted-foreground" /><input value={messageQuery} onChange={(event) => setMessageQuery(event.target.value)} placeholder="Search drafts…" className="bg-transparent text-xs outline-none" /></div></div></div>
          {!filteredMessages.length && <div className="border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">No drafts in this campaign.</div>}
          {filteredMessages.map((message) => {
            const edit = edits[message.id] || { channel: message.channel, subject: message.subject, body: message.body_text, language: message.language };
            const open = expanded === message.id;
            const locked = ["sent", "replied", "sending", "suppressed", "unsubscribed"].includes(message.status);
            return (
              <article key={message.id} className={`border bg-card/30 ${["sent", "replied"].includes(message.status) ? "border-emerald-500/40" : ["failed", "manual_required"].includes(message.status) ? "border-red-500/40" : "border-border/60"}`}>
                <button type="button" onClick={() => setExpanded(open ? null : message.id)} className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.13em] ${message.channel === "email" ? "border-cyan-500/40 text-cyan-300" : "border-emerald-500/40 text-emerald-300"}`}>{message.channel}</span><Status status={message.status} /></div><h4 className="mt-3 truncate font-display text-xl">{message.recipient_company}</h4><p className="mt-1 truncate text-[10px] text-gold">{message.recipient_email || message.recipient_whatsapp}</p><p className="mt-2 truncate text-xs text-foreground/65">{edit.subject}</p></div>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {open && (
                  <div className="space-y-4 border-t border-border/60 p-4 sm:p-5">
                    {(message.manual_reason || message.error) && <div className="flex items-start gap-2 border border-red-500/35 bg-red-500/5 p-3 text-xs text-red-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{message.manual_reason || message.error}</div>}
                    <div className="grid gap-3 sm:grid-cols-2"><Field label="Channel"><select disabled={locked} className="outreach-input" value={edit.channel} onChange={(event) => setEdits((current) => ({ ...current, [message.id]: { ...edit, channel: event.target.value as Channel } }))}><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></Field><Field label="Language"><input disabled={locked} className="outreach-input" value={edit.language} onChange={(event) => setEdits((current) => ({ ...current, [message.id]: { ...edit, language: event.target.value } }))} /></Field></div>
                    <Field label="Subject / internal title"><input disabled={locked} className="outreach-input" value={edit.subject} onChange={(event) => setEdits((current) => ({ ...current, [message.id]: { ...edit, subject: event.target.value } }))} /></Field>
                    <Field label="Message"><textarea disabled={locked} rows={8} className="outreach-input resize-y" value={edit.body} onChange={(event) => setEdits((current) => ({ ...current, [message.id]: { ...edit, body: event.target.value } }))} /></Field>
                    <div className="border border-sky-500/25 bg-sky-500/[0.04] p-3 text-[10px] text-foreground/65">The original uploaded lead workbook remains privately linked for audit. Buyer documents can be stored in Buyer 360. This send button transmits the approved message text through Gmail or WhatsApp; it does not falsely claim file attachments were sent.</div>
                    <div className="flex flex-wrap gap-3">
                      {!locked && <button type="button" onClick={() => void saveOnly(message)} disabled={busy !== null} className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-40">{busy === `save:${message.id}` ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save draft</button>}
                      {!locked && <button type="button" onClick={() => void approveAndSend(message)} disabled={busy !== null || (edit.channel === "email" ? !health?.gmail_ready : !health?.whatsapp_ready)} className="inline-flex min-h-11 items-center gap-2 bg-gradient-gold px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-40">{busy === `send:${message.id}` ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Approve & Send</button>}
                      {["sent", "replied"].includes(message.status) && <span className="inline-flex min-h-11 items-center gap-2 border border-emerald-500/40 px-4 text-[10px] uppercase tracking-[0.16em] text-emerald-300"><CheckCircle2 size={12} /> Sent {message.sent_at ? new Date(message.sent_at).toLocaleString() : ""}</span>}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function HealthStrip({ health }: { health: Health | null }) {
  if (!health) return <div className="border border-border/60 p-4 text-xs text-muted-foreground">Checking outreach backend…</div>;
  return <div className={`grid gap-3 border p-4 sm:grid-cols-4 ${health.database_ready ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-red-500/40 bg-red-500/5"}`}><HealthItem label="Database" ok={Boolean(health.database_ready)} /><HealthItem label="AI drafts" ok={Boolean(health.ai_ready)} /><HealthItem label="Gmail" ok={Boolean(health.gmail_ready)} /><HealthItem label="WhatsApp API" ok={Boolean(health.whatsapp_ready)} /><p className="sm:col-span-4 text-[10px] text-muted-foreground">WhatsApp automatic sending additionally requires a linked opted-in contact and an open Meta customer-service window or approved template. Otherwise the draft is saved as manual required, never falsely marked sent.</p></div>;
}
function HealthItem({ label, ok }: { label: string; ok: boolean }) { return <div className="flex items-center gap-2 text-xs">{ok ? <CheckCircle2 size={13} className="text-emerald-300" /> : <AlertTriangle size={13} className="text-red-300" />}<span>{label}: {ok ? "ready" : "not ready"}</span></div>; }
function Status({ status }: { status: string }) { const style = ["sent", "replied"].includes(status) ? "border-emerald-500/40 text-emerald-300" : ["failed", "manual_required"].includes(status) ? "border-red-500/40 text-red-300" : ["approved", "sending"].includes(status) ? "border-amber-500/40 text-amber-300" : "border-border/60 text-muted-foreground"; return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.13em] ${style}`}>{status.replace(/_/g, " ")}</span>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>{children}</label>; }
function isEligible(lead: Lead) { const score = Number(lead.verification_score); return (Number.isFinite(score) && score >= 70) || ELIGIBLE.has(lead.crm_status || ""); }
function validEmail(value: unknown) { const email = typeof value === "string" ? value.trim().toLowerCase() : ""; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; }
function normalizePhone(value: unknown) { const raw = typeof value === "string" ? value.trim() : ""; const match = raw.match(/(?:\+|00)?\d[\d\s().\/-]{6,}\d/)?.[0] || ""; const digits = match.replace(/\D/g, ""); return digits.length >= 7 && digits.length <= 16 ? match.trim() : null; }
function splitList(value: string) { return [...new Set(value.split(/[,\n|;]/).map((item) => item.trim()).filter(Boolean))]; }
function toggleSet(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }
function summarize(value: unknown) { if (!value || typeof value !== "object") return ""; return Object.entries(value as Record<string, unknown>).map(([key, amount]) => `${key.replace(/_/g, " ")}: ${amount}`).join(" · "); }
