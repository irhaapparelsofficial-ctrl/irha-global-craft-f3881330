import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Paperclip,
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
type MessageStatus = "draft" | "approved" | "sending" | "sent" | "failed" | "manual_required" | "rejected" | "suppressed" | "replied" | "unsubscribed" | "duplicate";
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
  target_market: string | null;
  product_focus: string[];
  status: string;
  draft_count: number;
  approved_count: number;
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
  status: MessageStatus;
  approved_at: string | null;
  sent_at: string | null;
  manual_reason: string | null;
  error: string | null;
  connector_response: Record<string, unknown>;
  created_at: string;
};
type BuyerFile = {
  id: string;
  source_type: string;
  source_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  description: string | null;
};
type AttachmentLink = {
  id: string;
  message_id: string;
  crm_file_id: string;
  status: string;
  error: string | null;
};
type Health = {
  ok?: boolean;
  database_ready?: boolean;
  ai_ready?: boolean;
  gmail_ready?: boolean;
  gmail_error?: string | null;
  whatsapp_ready?: boolean;
  whatsapp_configuration?: Record<string, boolean>;
  limits?: { generate?: number; email_attachment_bytes?: number; whatsapp_attachment_bytes?: number; whatsapp_attachments?: number };
  error?: string;
};
type MessageEdit = { channel: Channel; subject: string; body: string; language: string };
type CampaignForm = { name: string; productFocus: string; targetMarket: string; objective: string; language: string; cta: string; preferredChannel: "auto" | Channel };

const ELIGIBLE = new Set(["qualified", "contacted", "replied", "sample_requested", "quote_requested", "quotation_sent", "negotiation", "follow_up"]);
const initialForm: CampaignForm = {
  name: "",
  productFocus: "Private-label apparel",
  targetMarket: "",
  objective: "Introduce Irha Apparels as an experienced B2B manufacturer and start a conversation about the buyer's wholesale or private-label requirements.",
  language: "auto",
  cta: "Reply with your product requirements or request a scheduled live factory video call.",
  preferredChannel: "auto",
};

export default function OutreachApprovalPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [files, setFiles] = useState<BuyerFile[]>([]);
  const [links, setLinks] = useState<AttachmentLink[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, MessageEdit>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, Set<string>>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [leadQuery, setLeadQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadHealth = async () => {
    const { data, error } = await supabase.functions.invoke("outreach-workflow-v2", { body: { action: "health" } });
    setHealth(error ? { error: error.message } : data as Health);
  };

  const load = async (campaignId = selectedCampaignId) => {
    setLoading(true);
    const [leadResult, campaignResult, fileResult] = await Promise.all([
      db.from("b2b_leads")
        .select("id,company_name,country,email,phone,whatsapp,website,apparel_segment,buyer_type,crm_status,verification_score,outreach_opt_out,last_outreach_status")
        .order("updated_at", { ascending: false })
        .limit(2000),
      db.from("outreach_campaigns").select("*").order("created_at", { ascending: false }).limit(100),
      db.from("crm_files").select("id,source_type,source_id,file_name,mime_type,size_bytes,category,description").eq("source_type", "prospect").order("created_at", { ascending: false }).limit(3000),
    ]);
    if (leadResult.error) toast({ title: "Buyer leads could not load", description: leadResult.error.message, variant: "destructive" });
    if (campaignResult.error) toast({ title: "Outreach campaigns could not load", description: campaignResult.error.message, variant: "destructive" });
    if (fileResult.error) toast({ title: "Private buyer files could not load", description: fileResult.error.message, variant: "destructive" });

    const nextLeads = ((leadResult.data || []) as Lead[]).filter((lead) => !lead.outreach_opt_out && isEligible(lead) && Boolean(validEmail(lead.email) || normalizePhone(lead.whatsapp || lead.phone)));
    const nextCampaigns = (campaignResult.data || []) as Campaign[];
    setLeads(nextLeads);
    setCampaigns(nextCampaigns);
    setFiles((fileResult.data || []) as BuyerFile[]);

    let targetCampaign = campaignId;
    if (!targetCampaign && nextCampaigns[0]?.id) targetCampaign = nextCampaigns[0].id;
    if (targetCampaign) {
      const messageResult = await db.from("outreach_messages").select("*").eq("campaign_id", targetCampaign).order("created_at", { ascending: true }).limit(1000);
      if (messageResult.error) {
        toast({ title: "Outreach drafts could not load", description: messageResult.error.message, variant: "destructive" });
        setMessages([]);
        setLinks([]);
      } else {
        const nextMessages = (messageResult.data || []) as OutreachMessage[];
        setMessages(nextMessages);
        setEdits(Object.fromEntries(nextMessages.map((message) => [message.id, { channel: message.channel || "email", subject: message.subject, body: message.body_text, language: message.language }])));
        const messageIds = nextMessages.map((message) => message.id);
        if (messageIds.length) {
          const linkResult = await db.from("outreach_message_attachments").select("id,message_id,crm_file_id,status,error").in("message_id", messageIds).neq("status", "removed");
          const nextLinks = (linkResult.data || []) as AttachmentLink[];
          setLinks(nextLinks);
          const byMessage: Record<string, Set<string>> = {};
          for (const link of nextLinks) {
            if (!byMessage[link.message_id]) byMessage[link.message_id] = new Set();
            if (["selected", "sending", "sent", "manual_required"].includes(link.status)) byMessage[link.message_id].add(link.crm_file_id);
          }
          setSelectedFiles(byMessage);
        } else {
          setLinks([]);
          setSelectedFiles({});
        }
      }
      setSelectedCampaignId(targetCampaign);
    } else {
      setMessages([]);
      setLinks([]);
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
    return messages.filter((message) => !needle || [message.recipient_company, message.recipient_email, message.recipient_whatsapp, message.subject, message.body_text, message.status, message.channel].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [messageQuery, messages]);
  const activeCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;

  const generateDrafts = async () => {
    const ids = [...selectedLeadIds].slice(0, health?.limits?.generate || 50);
    if (!ids.length) { toast({ title: "Select at least one verified or qualified buyer", variant: "destructive" }); return; }
    if (!health?.ai_ready) { toast({ title: "AI draft generation is not ready", description: health?.error || "Check backend health.", variant: "destructive" }); return; }
    if (!form.objective.trim()) { toast({ title: "Campaign objective is required", variant: "destructive" }); return; }
    if (!window.confirm(`Generate ${ids.length} personalized one-to-one draft${ids.length === 1 ? "" : "s"}? Nothing will be approved or sent.`)) return;
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
    if (error || data?.ok !== true) { toast({ title: "Draft generation failed", description: data?.error || error?.message || "No draft was created", variant: "destructive" }); return; }
    setSelectedLeadIds(new Set());
    setForm(initialForm);
    setSelectedCampaignId(data.campaign_id);
    toast({ title: "Personalized drafts created", description: `${data.created || 0} drafts prepared. Nothing was sent.` });
    await load(data.campaign_id);
  };

  const saveDraft = async (message: OutreachMessage, sendAfterSave: boolean) => {
    const edit = edits[message.id];
    if (!edit?.subject.trim() || !edit.body.trim()) { toast({ title: "Subject and message body are required", variant: "destructive" }); return; }
    if (sendAfterSave && !window.confirm(`Approve and send this ${edit.channel === "email" ? "email" : "WhatsApp message"} to ${message.recipient_company}? Sending is irreversible when the provider accepts it.`)) return;
    setBusy(`${sendAfterSave ? "dispatch" : "save"}:${message.id}`);
    const updated = await supabase.functions.invoke("outreach-workflow-v2", { body: { action: "update", message_id: message.id, channel: edit.channel, subject: edit.subject, body_text: edit.body, language: edit.language } });
    if (updated.error || updated.data?.ok !== true) {
      setBusy(null);
      toast({ title: "Draft update failed", description: updated.data?.error || updated.error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    const attachmentIds = [...(selectedFiles[message.id] || new Set<string>())];
    const attachments = await supabase.functions.invoke("outreach-workflow-v2", { body: { action: "set_attachments", message_id: message.id, file_ids: attachmentIds } });
    if (attachments.error || attachments.data?.ok !== true) {
      setBusy(null);
      toast({ title: "Attachment selection failed", description: attachments.data?.error || attachments.error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    if (!sendAfterSave) {
      setBusy(null);
      toast({ title: "Draft and attachments saved", description: "Approval remains pending. Nothing was sent." });
      await load(selectedCampaignId);
      return;
    }
    const dispatched = await supabase.functions.invoke("outreach-workflow-v2", { body: { action: "approve_and_send", message_id: message.id, owner_confirmed: true } });
    setBusy(null);
    if (dispatched.data?.status === "manual_required") {
      toast({ title: "Manual action required", description: dispatched.data.reason || "Provider rules blocked automatic sending.", variant: "destructive" });
    } else if (dispatched.error || dispatched.data?.ok !== true) {
      toast({ title: "Send failed safely", description: dispatched.data?.error || dispatched.error?.message || "Exact failure was saved.", variant: "destructive" });
    } else {
      toast({ title: `${edit.channel === "email" ? "Email" : "WhatsApp message"} sent`, description: `${dispatched.data.attachment_count || 0} selected attachment${dispatched.data.attachment_count === 1 ? "" : "s"} processed.` });
    }
    await Promise.all([load(selectedCampaignId), loadHealth()]);
  };

  const toggleFile = (messageId: string, fileId: string) => setSelectedFiles((current) => {
    const next = new Set(current[messageId] || []);
    if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
    return { ...current, [messageId]: next };
  });

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold"><ShieldCheck size={15} /> Owner-approved outreach</div>
            <h2 className="font-display text-3xl md:text-4xl">Draft → Review → Approve & Send</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">AI prepares one truthful draft per eligible buyer. You choose email or WhatsApp, edit the wording, attach real private buyer files and press one approval button. No draft can send itself.</p>
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
            <div className="mb-3 flex gap-3 text-[9px] uppercase tracking-[0.14em]"><button type="button" className="text-gold" onClick={() => setSelectedLeadIds(new Set(filteredLeads.slice(0, health?.limits?.generate || 50).map((lead) => lead.id)))}>Select visible</button><button type="button" className="text-muted-foreground" onClick={() => setSelectedLeadIds(new Set())}>Clear</button></div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {!filteredLeads.length && <p className="py-5 text-center text-xs text-muted-foreground">No eligible buyer with email or WhatsApp. Review and activate candidates first.</p>}
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
              {campaigns.map((campaign) => <button type="button" key={campaign.id} onClick={() => void load(campaign.id)} className={`w-full border p-3 text-left ${selectedCampaignId === campaign.id ? "border-gold/70 bg-gold/5" : "border-border/50"}`}><p className="truncate text-xs font-medium">{campaign.name}</p><p className="mt-1 text-[9px] text-muted-foreground">{campaign.status} · {campaign.sent_count} sent · {campaign.failed_count} blocked/failed</p></button>)}
            </div>
          </div>
        </section>

        <section className="space-y-5 xl:col-span-8">
          <div className="border border-border/60 bg-card/30 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">One-by-one review</p><h3 className="mt-1 font-display text-2xl">{activeCampaign?.name || "Select a campaign"}</h3></div><div className="flex items-center gap-2 border border-border/60 px-3 py-2"><Search size={12} className="text-muted-foreground" /><input value={messageQuery} onChange={(event) => setMessageQuery(event.target.value)} placeholder="Search drafts…" className="bg-transparent text-xs outline-none" /></div></div>
          </div>

          {!filteredMessages.length && <div className="border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">No drafts in this campaign.</div>}
          {filteredMessages.map((message) => {
            const edit = edits[message.id] || { channel: message.channel, subject: message.subject, body: message.body_text, language: message.language };
            const buyerFiles = files.filter((file) => file.source_id === message.lead_id);
            const selected = selectedFiles[message.id] || new Set<string>();
            const locked = ["sent", "replied", "sending", "suppressed", "unsubscribed"].includes(message.status);
            const isExpanded = expanded === message.id;
            return (
              <article key={message.id} className={`border bg-card/30 ${message.status === "sent" || message.status === "replied" ? "border-emerald-500/40" : message.status === "manual_required" || message.status === "failed" ? "border-red-500/40" : "border-border/60"}`}>
                <button type="button" onClick={() => setExpanded(isExpanded ? null : message.id)} className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.13em] ${message.channel === "email" ? "border-cyan-500/40 text-cyan-300" : "border-emerald-500/40 text-emerald-300"}`}>{message.channel}</span><StatusBadge status={message.status} /></div><h4 className="mt-3 truncate font-display text-xl">{message.recipient_company}</h4><p className="mt-1 truncate text-[10px] text-gold">{message.recipient_email || message.recipient_whatsapp}</p><p className="mt-2 truncate text-xs text-foreground/65">{edit.subject}</p></div>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isExpanded && (
                  <div className="space-y-5 border-t border-border/60 p-4 sm:p-5">
                    {(message.manual_reason || message.error) && <div className="flex items-start gap-2 border border-red-500/35 bg-red-500/5 p-3 text-xs text-red-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{message.manual_reason || message.error}</div>}
                    <div className="grid gap-3 sm:grid-cols-2"><Field label="Channel"><select disabled={locked} className="outreach-input" value={edit.channel} onChange={(event) => setEdits((current) => ({ ...current, [message.id]: { ...edit, channel: event.target.value as Channel } }))}><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></Field><Field label="Language"><input disabled={locked} className="outreach-input" value={edit.language} onChange={(event) => setEdits((current) => ({ ...current, [message.id]: { ...edit, language: event.target.value } }))} /></Field></div>
                    <Field label="Subject / internal title"><input disabled={locked} className="outreach-input" value={edit.subject} onChange={(event) => setEdits((current) => ({ ...current, [message.id]: { ...edit, subject: event.target.value } }))} /></Field>
                    <Field label="Message"><textarea disabled={locked} rows={8} className="outreach-input resize-y" value={edit.body} onChange={(event) => setEdits((current) => ({ ...current, [message.id]: { ...edit, body: event.target.value } }))} /></Field>

                    <div className="border border-border/60 bg-background/20 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Paperclip size={14} className="text-gold" /><p className="text-xs font-medium">Real private buyer files</p></div><span className="text-[9px] text-muted-foreground">{selected.size} selected</span></div>
                      {!buyerFiles.length ? <p className="text-xs text-muted-foreground">No private file is attached to this buyer yet. Add a catalogue, quotation, sample image or other file in Buyer 360.</p> : <div className="space-y-2">{buyerFiles.map((file) => <label key={file.id} className={`flex cursor-pointer items-start gap-3 border p-3 ${selected.has(file.id) ? "border-gold/60 bg-gold/5" : "border-border/50"}`}><input type="checkbox" disabled={locked} className="mt-1" checked={selected.has(file.id)} onChange={() => toggleFile(message.id, file.id)} /><FileText size={14} className="mt-0.5 shrink-0 text-gold" /><div className="min-w-0"><p className="break-all text-xs">{file.file_name}</p><p className="mt-1 text-[9px] text-muted-foreground">{file.category} · {formatBytes(file.size_bytes)} · {file.mime_type}</p></div></label>)}</div>}
                      {edit.channel === "whatsapp" && selected.size > 0 && <p className="mt-3 text-[10px] text-amber-300">WhatsApp media in this workflow accepts up to 3 JPG, PNG, WEBP or PDF files, maximum 5 MB each, and only inside a valid Meta customer-service window.</p>}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {!locked && <button type="button" onClick={() => void saveDraft(message, false)} disabled={busy !== null} className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-40">{busy === `save:${message.id}` ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save draft</button>}
                      {!locked && <button type="button" onClick={() => void saveDraft(message, true)} disabled={busy !== null || (edit.channel === "email" ? !health?.gmail_ready : !health?.whatsapp_ready)} className="inline-flex min-h-11 items-center gap-2 bg-gradient-gold px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-40">{busy === `dispatch:${message.id}` ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Approve & Send</button>}
                      {(message.status === "sent" || message.status === "replied") && <span className="inline-flex min-h-11 items-center gap-2 border border-emerald-500/40 px-4 text-[10px] uppercase tracking-[0.16em] text-emerald-300"><CheckCircle2 size={12} /> Sent {message.sent_at ? new Date(message.sent_at).toLocaleString() : ""}</span>}
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
  return <div className={`grid gap-3 border p-4 sm:grid-cols-4 ${health.database_ready ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-red-500/40 bg-red-500/5"}`}><HealthItem label="Database" ok={Boolean(health.database_ready)} /><HealthItem label="AI drafts" ok={Boolean(health.ai_ready)} /><HealthItem label="Gmail" ok={Boolean(health.gmail_ready)} /><HealthItem label="WhatsApp API" ok={Boolean(health.whatsapp_ready)} /><p className="sm:col-span-4 text-[10px] text-muted-foreground">WhatsApp automatic sending additionally requires a linked opted-in contact and an open Meta customer-service window. Otherwise the approved draft is saved as manual required, never falsely marked sent.</p></div>;
}
function HealthItem({ label, ok }: { label: string; ok: boolean }) { return <div className="flex items-center gap-2 text-xs">{ok ? <CheckCircle2 size={13} className="text-emerald-300" /> : <AlertTriangle size={13} className="text-red-300" />}<span>{label}: {ok ? "ready" : "not ready"}</span></div>; }
function StatusBadge({ status }: { status: MessageStatus }) { const style = status === "sent" || status === "replied" ? "border-emerald-500/40 text-emerald-300" : status === "failed" || status === "manual_required" ? "border-red-500/40 text-red-300" : status === "approved" || status === "sending" ? "border-amber-500/40 text-amber-300" : "border-border/60 text-muted-foreground"; return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.13em] ${style}`}>{status.replace(/_/g, " ")}</span>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>{children}</label>; }
function isEligible(lead: Lead) { const score = Number(lead.verification_score); return (Number.isFinite(score) && score >= 70) || ELIGIBLE.has(lead.crm_status || ""); }
function validEmail(value: unknown) { const email = typeof value === "string" ? value.trim().toLowerCase() : ""; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; }
function normalizePhone(value: unknown) { const raw = typeof value === "string" ? value.trim() : ""; const match = raw.match(/(?:\+|00)?\d[\d\s().\/-]{6,}\d/)?.[0] || ""; const digits = match.replace(/\D/g, ""); return digits.length >= 7 && digits.length <= 16 ? match.trim() : null; }
function splitList(value: string) { return [...new Set(value.split(/[,\n|;]/).map((item) => item.trim()).filter(Boolean))]; }
function toggleSet(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }
function formatBytes(value: number) { if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`; return `${(value / 1024 / 1024).toFixed(1)} MB`; }
