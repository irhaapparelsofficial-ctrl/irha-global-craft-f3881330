import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const ELIGIBLE_CRM_STATUSES = new Set(["qualified", "contacted", "replied", "sample_requested", "quote_requested", "quotation_sent", "negotiation", "follow_up"]);

type Candidate = {
  id: string;
  company_name: string;
  website: string | null;
  website_domain: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  buyer_type: string | null;
  product_fit: string[];
  source_url: string | null;
  evidence: Record<string, unknown>;
  verification_status: string;
  verification_score: number;
};

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
  priority: string | null;
  verification_score: number | null;
  outreach_opt_out: boolean | null;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  target_market: string | null;
  product_focus: string[];
  selected_lead_count: number;
  draft_count: number;
  approved_count: number;
  sent_count: number;
  replied_count: number;
  failed_count: number;
  created_at: string;
};

type MessageLead = {
  whatsapp?: string | null;
  phone?: string | null;
  country?: string | null;
  buyer_type?: string | null;
  apparel_segment?: string | null;
  website?: string | null;
};

type OutreachMessage = {
  id: string;
  campaign_id: string;
  lead_id: string;
  recipient_email: string;
  recipient_company: string;
  language: string;
  subject: string;
  body_text: string;
  personalization_evidence: Record<string, unknown>;
  status: string;
  approved_at: string | null;
  approved_by: string | null;
  sent_at: string | null;
  replied_at: string | null;
  error: string | null;
  created_at: string;
  b2b_leads?: MessageLead | null;
};

type PackageEdit = {
  subject: string;
  body_text: string;
  language: string;
  whatsapp_text: string;
  recommended_channel: string;
};

type RuntimeHealth = {
  ready_to_generate?: boolean;
  ready_to_send?: boolean;
  gmail_verified?: boolean;
  gmail_error?: string | null;
  error?: string;
};

type ChannelHealth = {
  ready?: boolean;
  ai_gateway_configured?: boolean;
  database_ready?: boolean;
  send_capability?: boolean;
  error?: string;
};

const defaultCampaign = {
  name: "",
  productFocus: "Lederhosen, Dirndl, Trachten wear, sportswear, activewear, uniforms and private-label apparel",
  targetMarket: "Germany, Austria and international B2B buyers",
};

export default function AdminOutreachApproval() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [activeMessageId, setActiveMessageId] = useState("");
  const [edits, setEdits] = useState<Record<string, PackageEdit>>({});
  const [campaignDraft, setCampaignDraft] = useState(defaultCampaign);
  const [outreachHealth, setOutreachHealth] = useState<RuntimeHealth | null>(null);
  const [channelHealth, setChannelHealth] = useState<ChannelHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    const [outreach, channel] = await Promise.all([
      supabase.functions.invoke("outreach-engine", { body: { action: "health" } }),
      supabase.functions.invoke("outreach-channel-copilot", { body: { action: "health" } }),
    ]);
    setOutreachHealth(outreach.error ? { error: outreach.error.message } : (outreach.data as RuntimeHealth));
    setChannelHealth(channel.error ? { error: channel.error.message } : (channel.data as ChannelHealth));
  }, []);

  const loadMessages = useCallback(async (campaignId: string) => {
    if (!campaignId) {
      setMessages([]);
      setActiveMessageId("");
      return;
    }
    const result = await db
      .from("outreach_messages")
      .select("id,campaign_id,lead_id,recipient_email,recipient_company,language,subject,body_text,personalization_evidence,status,approved_at,approved_by,sent_at,replied_at,error,created_at,b2b_leads(whatsapp,phone,country,buyer_type,apparel_segment,website)")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (result.error) throw result.error;
    const rows = ((result.data || []) as OutreachMessage[]).map(normalizeMessage);
    setMessages(rows);
    setEdits(Object.fromEntries(rows.map((message) => [message.id, packageEdit(message)])));
    setActiveMessageId((current) => current && rows.some((message) => message.id === current) ? current : nextReviewMessage(rows)?.id || rows[0]?.id || "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [candidateResult, leadResult, campaignResult] = await Promise.all([
        db.from("lead_candidates").select("id,company_name,website,website_domain,country,email,phone,whatsapp,buyer_type,product_fit,source_url,evidence,verification_status,verification_score").in("verification_status", ["needs_review", "verified"]).is("imported_lead_id", null).order("verification_score", { ascending: false }).limit(2000),
        db.from("b2b_leads").select("id,company_name,country,email,phone,whatsapp,website,apparel_segment,buyer_type,crm_status,priority,verification_score,outreach_opt_out").not("email", "is", null).order("updated_at", { ascending: false }).limit(3000),
        db.from("outreach_campaigns").select("id,name,status,target_market,product_focus,selected_lead_count,draft_count,approved_count,sent_count,replied_count,failed_count,created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      const firstError = candidateResult.error || leadResult.error || campaignResult.error;
      if (firstError) throw firstError;
      const nextCandidates = ((candidateResult.data || []) as Candidate[]).map((row) => ({ ...row, product_fit: Array.isArray(row.product_fit) ? row.product_fit : [], evidence: isRecord(row.evidence) ? row.evidence : {}, verification_score: Number(row.verification_score || 0) }));
      const nextLeads = ((leadResult.data || []) as Lead[]).filter(isEligibleLead);
      const nextCampaigns = (campaignResult.data || []) as Campaign[];
      setCandidates(nextCandidates);
      setLeads(nextLeads);
      setCampaigns(nextCampaigns);
      setSelectedCandidateIds((current) => new Set([...current].filter((id) => nextCandidates.some((row) => row.id === id))));
      setSelectedLeadIds((current) => new Set([...current].filter((id) => nextLeads.some((row) => row.id === id))));
      const campaignId = selectedCampaignId && nextCampaigns.some((campaign) => campaign.id === selectedCampaignId) ? selectedCampaignId : nextCampaigns[0]?.id || "";
      setSelectedCampaignId(campaignId);
      await loadMessages(campaignId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Approval Copilot data could not load");
    } finally {
      setLoading(false);
    }
  }, [loadMessages, selectedCampaignId]);

  useEffect(() => { void Promise.all([load(), loadHealth()]); }, []);

  const strictReadyCandidates = useMemo(() => candidates.filter((candidate) => candidateBlockers(candidate).length === 0), [candidates]);
  const selectedReadyCandidates = useMemo(() => strictReadyCandidates.filter((candidate) => selectedCandidateIds.has(candidate.id)), [strictReadyCandidates, selectedCandidateIds]);
  const packageQueue = useMemo(() => messages.filter((message) => !["suppressed", "unsubscribed"].includes(message.status)), [messages]);
  const activeMessage = packageQueue.find((message) => message.id === activeMessageId) || null;
  const activeIndex = activeMessage ? packageQueue.findIndex((message) => message.id === activeMessage.id) : -1;
  const packageStats = useMemo(() => ({
    total: messages.length,
    draft: messages.filter((message) => message.status === "draft").length,
    approved: messages.filter((message) => message.status === "approved").length,
    sent: messages.filter((message) => ["sent", "replied"].includes(message.status)).length,
    whatsappReady: messages.filter((message) => Boolean(channelData(message).whatsapp_text)).length,
  }), [messages]);

  const activateCandidates = async () => {
    if (!selectedReadyCandidates.length) return;
    if (!window.confirm(`Approve and import ${selectedReadyCandidates.length} strict-ready compan${selectedReadyCandidates.length === 1 ? "y" : "ies"} into Buyer CRM? No message will be generated or sent in this step.`)) return;
    setBusy("activate");
    const reviewed: string[] = [];
    const failures: string[] = [];
    for (const candidate of selectedReadyCandidates.slice(0, 100)) {
      if (candidate.verification_status === "verified") {
        reviewed.push(candidate.id);
        continue;
      }
      const result = await supabase.functions.invoke("lead-research", { body: { action: "review", candidate_id: candidate.id, status: "verified", verification_score: Math.max(70, candidate.verification_score) } });
      if (result.error || result.data?.ok !== true) failures.push(`${candidate.company_name}: ${result.data?.error || result.error?.message || "review failed"}`);
      else reviewed.push(candidate.id);
    }
    let imported = 0;
    let skipped = 0;
    if (reviewed.length) {
      const result = await supabase.functions.invoke("lead-research", { body: { action: "import", candidate_ids: reviewed } });
      if (result.error || result.data?.ok !== true) failures.push(result.data?.error || result.error?.message || "CRM import failed");
      else { imported = Number(result.data.imported_count || 0); skipped = Number(result.data.skipped_count || 0); }
    }
    setBusy("");
    setSelectedCandidateIds(new Set());
    toast({ title: failures.length ? "CRM activation completed with exceptions" : "CRM activation completed", description: `${imported} imported · ${skipped} skipped${failures.length ? ` · ${failures.length} exception(s)` : ""}. Nothing was sent.`, variant: failures.length ? "destructive" : "default" });
    await load();
  };

  const generatePackages = async () => {
    const leadIds = [...selectedLeadIds].slice(0, 50);
    if (!leadIds.length) return;
    if (!outreachHealth?.ready_to_generate || !channelHealth?.ready) {
      toast({ title: "AI package generation is not ready", description: outreachHealth?.error || channelHealth?.error || "Check AI runtime health.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Generate ${leadIds.length} personalized email and WhatsApp draft package${leadIds.length === 1 ? "" : "s"}? Nothing will be approved or sent.`)) return;
    setBusy("generate");
    const generated = await supabase.functions.invoke("outreach-engine", {
      body: {
        action: "generate",
        lead_ids: leadIds,
        campaign: {
          name: campaignDraft.name,
          product_focus: splitList(campaignDraft.productFocus),
          target_market: campaignDraft.targetMarket,
          objective: "Introduce Irha Apparels as an experienced B2B manufacturer and start a relevant wholesale, private-label or custom-manufacturing conversation using only verified buyer facts.",
          language_mode: "auto",
          call_to_action: "Reply with product requirements or request a live factory video call.",
        },
      },
    });
    if (generated.error || generated.data?.ok !== true) {
      setBusy("");
      toast({ title: "Email draft generation failed", description: generated.data?.error || generated.error?.message || "No drafts created", variant: "destructive" });
      return;
    }
    const campaignId = String(generated.data.campaign_id || "");
    const channel = await supabase.functions.invoke("outreach-channel-copilot", { body: { action: "prepare", campaign_id: campaignId } });
    setBusy("");
    setSelectedLeadIds(new Set());
    setSelectedCampaignId(campaignId);
    toast({
      title: channel.error || channel.data?.ok !== true ? "Email drafts created; WhatsApp preparation has exceptions" : "Outreach packages prepared",
      description: `${Number(generated.data.created || 0)} email drafts · ${Number(channel.data?.prepared_count || 0)} WhatsApp drafts · nothing approved or sent.`,
      variant: channel.error || channel.data?.ok !== true ? "destructive" : "default",
    });
    await Promise.all([load(), loadMessages(campaignId)]);
  };

  const prepareMissingChannels = async () => {
    if (!selectedCampaignId) return;
    setBusy("prepare");
    const result = await supabase.functions.invoke("outreach-channel-copilot", { body: { action: "prepare", campaign_id: selectedCampaignId } });
    setBusy("");
    if (result.error || result.data?.ok !== true) {
      toast({ title: "WhatsApp draft preparation failed", description: result.data?.error || result.error?.message || "No drafts prepared", variant: "destructive" });
      return;
    }
    toast({ title: "Channel drafts checked", description: `${result.data.prepared_count || 0} prepared · ${result.data.skipped_count || 0} already ready · ${result.data.failed_count || 0} failed.` });
    await loadMessages(selectedCampaignId);
  };

  const savePackage = async (message: OutreachMessage, status: "draft" | "approved" | "rejected") => {
    const edit = edits[message.id];
    if (!edit?.subject.trim() || !edit.body_text.trim()) {
      toast({ title: "Email subject and body are required", variant: "destructive" });
      return;
    }
    if (status === "approved" && !edit.whatsapp_text.trim()) {
      toast({ title: "Prepare or write the WhatsApp copy before approval", variant: "destructive" });
      return;
    }
    setBusy(`save:${message.id}`);
    if (edit.whatsapp_text.trim()) {
      const channel = await supabase.functions.invoke("outreach-channel-copilot", { body: { action: "update", message_id: message.id, whatsapp_text: edit.whatsapp_text, recommended_channel: edit.recommended_channel } });
      if (channel.error || channel.data?.ok !== true) {
        setBusy("");
        toast({ title: "WhatsApp draft save failed", description: channel.data?.error || channel.error?.message || "Draft rejected", variant: "destructive" });
        return;
      }
    }
    const email = await supabase.functions.invoke("outreach-engine", { body: { action: "update", message_id: message.id, subject: edit.subject, body_text: edit.body_text, language: edit.language, status } });
    setBusy("");
    if (email.error || email.data?.ok !== true) {
      toast({ title: "Email draft update failed", description: email.data?.error || email.error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    const next = nextAfter(packageQueue, message.id);
    setActiveMessageId(next?.id || message.id);
    toast({ title: status === "approved" ? "Package approved and queued" : status === "rejected" ? "Package rejected" : "Package saved", description: "No external message was sent." });
    await loadMessages(selectedCampaignId);
  };

  const exportPackages = () => {
    const headers = ["Company", "Email", "Language", "Email Subject", "Email Body", "WhatsApp Number", "WhatsApp Draft", "Recommended Channel", "Status", "Approved At", "Sent At", "Campaign ID"];
    const rows = messages.map((message) => {
      const channel = channelData(message);
      return [message.recipient_company, message.recipient_email, message.language, message.subject, message.body_text, channel.whatsapp_number || "", channel.whatsapp_text || "", channel.recommended_channel || "Email", message.status, message.approved_at || "", message.sent_at || "", message.campaign_id];
    });
    downloadCsv(`irha-outreach-packages-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  if (authLoading) return <Centered>Checking owner access…</Centered>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Centered>Admin access is required.</Centered>;

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6 lg:p-8">
      <SEO title="Outreach Approval Copilot — Irha Apparels" description="Private owner outreach package approval queue." path="/admin/outreach-approval" noindex />
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Owner-only · Large Batch 2</p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl">Outreach Approval Copilot</h1>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">Activate strict-ready companies, generate localized email and WhatsApp copy together, approve one package at a time, then use the existing Gmail workspace for a separate irreversible send confirmation.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/admin" className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-gold hover:text-gold"><ArrowLeft size={12} /> Admin</a>
              <a href="/admin/lead-intake" className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-gold hover:text-gold"><FileSpreadsheet size={12} /> Lead Intake</a>
              <button type="button" onClick={() => void Promise.all([load(), loadHealth()])} disabled={loading || Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 border border-gold/50 px-4 text-[10px] uppercase tracking-[0.15em] text-gold hover:bg-gold hover:text-background disabled:opacity-40"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
            </div>
          </div>
        </header>

        <div className="border border-sky-500/30 bg-sky-500/[0.04] p-4">
          <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-sky-300" /><p className="text-sm text-foreground/70"><strong>Approval boundary:</strong> AI prepares copy only. Approve & Next does not send. Gmail sending remains a separate confirmation; WhatsApp opens a prefilled chat but never presses Send. Official API sending remains limited to opted-in inbox conversations.</p></div>
        </div>

        {error && <div className="border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Metric label="Strict-ready candidates" value={strictReadyCandidates.length} icon={<UserCheck size={14} />} />
          <Metric label="Eligible CRM buyers" value={leads.length} icon={<Users size={14} />} />
          <Metric label="Packages" value={packageStats.total} icon={<Mail size={14} />} />
          <Metric label="WhatsApp ready" value={packageStats.whatsappReady} icon={<MessageCircle size={14} />} />
          <Metric label="Approved" value={packageStats.approved} icon={<CheckCircle2 size={14} />} />
          <Metric label="Sent / replied" value={packageStats.sent} icon={<Send size={14} />} />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <div className="border border-border/60 bg-card/25 p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Step 1 · CRM activation</p>
            <h2 className="mt-1 font-display text-2xl">Approve strict-ready companies</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Only candidates with valid email, website/source, buyer type, product fit, evidence and score 70+ are selectable.</p>
            <div className="mt-4 flex gap-3 text-[9px] uppercase tracking-[0.14em]"><button type="button" onClick={() => setSelectedCandidateIds(new Set(strictReadyCandidates.map((row) => row.id)))} className="text-gold">Select all</button><button type="button" onClick={() => setSelectedCandidateIds(new Set())} className="text-muted-foreground">Clear</button></div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {strictReadyCandidates.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No strict-ready unimported candidates.</p> : strictReadyCandidates.map((candidate) => <label key={candidate.id} className={`block cursor-pointer border p-3 ${selectedCandidateIds.has(candidate.id) ? "border-gold/60 bg-gold/5" : "border-border/50"}`}><div className="flex items-start gap-3"><input type="checkbox" checked={selectedCandidateIds.has(candidate.id)} onChange={() => setSelectedCandidateIds((current) => toggleSet(current, candidate.id))} className="mt-1" /><div className="min-w-0"><p className="truncate text-sm font-medium">{candidate.company_name}</p><p className="mt-1 truncate text-[10px] text-gold">{candidate.email}</p><p className="mt-1 text-[9px] text-muted-foreground">{candidate.country || "Country missing"} · score {candidate.verification_score}</p></div></div></label>)}
            </div>
            <button type="button" onClick={() => void activateCandidates()} disabled={!selectedReadyCandidates.length || Boolean(busy)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-gradient-gold px-4 text-[10px] uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-40">{busy === "activate" ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />} Activate {selectedReadyCandidates.length || "selected"} in CRM</button>
          </div>

          <div className="border border-border/60 bg-card/25 p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Step 2 · AI packages</p>
            <h2 className="mt-1 font-display text-2xl">Select buyers and generate</h2>
            <div className="mt-4 space-y-3">
              <Field label="Campaign name"><input value={campaignDraft.name} onChange={(event) => setCampaignDraft((current) => ({ ...current, name: event.target.value }))} placeholder="July buyer outreach" className="approval-input" /></Field>
              <Field label="Product focus"><textarea rows={3} value={campaignDraft.productFocus} onChange={(event) => setCampaignDraft((current) => ({ ...current, productFocus: event.target.value }))} className="approval-input resize-y" /></Field>
              <Field label="Target market"><input value={campaignDraft.targetMarket} onChange={(event) => setCampaignDraft((current) => ({ ...current, targetMarket: event.target.value }))} className="approval-input" /></Field>
            </div>
            <div className="mt-4 flex gap-3 text-[9px] uppercase tracking-[0.14em]"><button type="button" onClick={() => setSelectedLeadIds(new Set(leads.slice(0, 50).map((row) => row.id)))} className="text-gold">Select first 50</button><button type="button" onClick={() => setSelectedLeadIds(new Set())} className="text-muted-foreground">Clear</button></div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {leads.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Activate strict-ready candidates first.</p> : leads.map((lead) => <label key={lead.id} className={`block cursor-pointer border p-3 ${selectedLeadIds.has(lead.id) ? "border-gold/60 bg-gold/5" : "border-border/50"}`}><div className="flex items-start gap-3"><input type="checkbox" checked={selectedLeadIds.has(lead.id)} onChange={() => setSelectedLeadIds((current) => toggleSet(current, lead.id))} className="mt-1" /><div className="min-w-0"><p className="truncate text-sm font-medium">{lead.company_name}</p><p className="mt-1 truncate text-[10px] text-gold">{lead.email}</p><p className="mt-1 text-[9px] text-muted-foreground">{lead.country} · {lead.buyer_type || lead.apparel_segment || "Buyer"} · score {lead.verification_score ?? "—"}</p></div></div></label>)}
            </div>
            <button type="button" onClick={() => void generatePackages()} disabled={!selectedLeadIds.size || Boolean(busy) || !outreachHealth?.ready_to_generate || !channelHealth?.ready} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-gradient-gold px-4 text-[10px] uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-40">{busy === "generate" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate {selectedLeadIds.size || "selected"} packages</button>
            <div className="mt-3 flex flex-wrap gap-2 text-[9px]"><RuntimeFlag label="Email AI" active={Boolean(outreachHealth?.ready_to_generate)} /><RuntimeFlag label="Channel AI" active={Boolean(channelHealth?.ready)} /><RuntimeFlag label="Gmail verified" active={Boolean(outreachHealth?.gmail_verified)} /></div>
          </div>

          <div className="border border-border/60 bg-card/25 p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Campaign queue</p>
            <h2 className="mt-1 font-display text-2xl">Choose generated work</h2>
            <select value={selectedCampaignId} onChange={(event) => { setSelectedCampaignId(event.target.value); void loadMessages(event.target.value); }} className="approval-input mt-4">
              <option value="">No campaign selected</option>
              {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status} · {campaign.draft_count} drafts</option>)}
            </select>
            <div className="mt-4 grid grid-cols-2 gap-2"><MiniMetric label="Draft" value={packageStats.draft} /><MiniMetric label="Approved" value={packageStats.approved} /><MiniMetric label="WhatsApp" value={packageStats.whatsappReady} /><MiniMetric label="Sent" value={packageStats.sent} /></div>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => void prepareMissingChannels()} disabled={!selectedCampaignId || Boolean(busy) || !channelHealth?.ready} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-40">{busy === "prepare" ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />} Prepare missing WhatsApp drafts</button>
              <button type="button" onClick={exportPackages} disabled={!messages.length} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-40"><Download size={12} /> Export complete package CSV</button>
              <a href="/admin" className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-emerald-500/40 px-3 text-[9px] uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-500/10"><Send size={12} /> Open admin for final Gmail send</a>
            </div>
            {(outreachHealth?.error || channelHealth?.error || outreachHealth?.gmail_error) && <p className="mt-3 text-xs text-amber-300">{outreachHealth?.error || channelHealth?.error || outreachHealth?.gmail_error}</p>}
          </div>
        </section>

        <section className="border border-border/60 bg-card/25">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Step 3 · One-by-one approval</p><h2 className="mt-1 font-display text-2xl">Approve & Next</h2></div>
            <div className="flex items-center gap-2"><button type="button" onClick={() => setActiveMessageId(packageQueue[Math.max(0, activeIndex - 1)]?.id || activeMessageId)} disabled={activeIndex <= 0} className="inline-flex min-h-10 items-center gap-1 border border-border/60 px-3 text-[9px] uppercase disabled:opacity-30"><ChevronLeft size={12} /> Previous</button><span className="text-[10px] text-muted-foreground">{activeIndex >= 0 ? activeIndex + 1 : 0} / {packageQueue.length}</span><button type="button" onClick={() => setActiveMessageId(packageQueue[Math.min(packageQueue.length - 1, activeIndex + 1)]?.id || activeMessageId)} disabled={activeIndex < 0 || activeIndex >= packageQueue.length - 1} className="inline-flex min-h-10 items-center gap-1 border border-border/60 px-3 text-[9px] uppercase disabled:opacity-30">Next <ChevronRight size={12} /></button></div>
          </div>

          {!activeMessage ? <div className="p-12 text-center"><Mail size={30} className="mx-auto text-muted-foreground" /><h3 className="mt-3 font-display text-xl">No generated package selected</h3><p className="mt-2 text-sm text-muted-foreground">Activate buyers and generate AI packages above.</p></div> : (() => {
            const edit = edits[activeMessage.id] || packageEdit(activeMessage);
            const channel = channelData(activeMessage);
            const canOpenWhatsApp = Boolean(whatsappUrl(channel.whatsapp_number, edit.whatsapp_text));
            return <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><StatusBadge status={activeMessage.status} /><span className="border border-border/60 px-2 py-1 text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{edit.language}</span></div><h3 className="mt-3 font-display text-2xl">{activeMessage.recipient_company}</h3><p className="mt-1 text-[10px] text-gold">{activeMessage.recipient_email}</p></div>{activeMessage.error && <p className="max-w-sm text-xs text-red-300">{activeMessage.error}</p>}</div>
                <Field label="Language"><input value={edit.language} onChange={(event) => updateEdit(setEdits, activeMessage.id, { language: event.target.value })} className="approval-input" /></Field>
                <Field label="Email subject"><input value={edit.subject} onChange={(event) => updateEdit(setEdits, activeMessage.id, { subject: event.target.value })} className="approval-input" /></Field>
                <Field label="Email body"><textarea rows={12} value={edit.body_text} onChange={(event) => updateEdit(setEdits, activeMessage.id, { body_text: event.target.value })} className="approval-input resize-y" /></Field>
                <button type="button" onClick={() => void copyText(`${edit.subject}\n\n${edit.body_text}`, "Email draft copied")} className="inline-flex min-h-10 items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><ClipboardCopy size={12} /> Copy email</button>
              </div>

              <div className="space-y-4">
                <div className="border border-emerald-500/30 bg-emerald-500/[0.04] p-4"><div className="flex items-start gap-3"><MessageCircle size={18} className="mt-0.5 shrink-0 text-emerald-300" /><div><p className="font-medium">WhatsApp copy/open draft</p><p className="mt-1 text-xs text-foreground/60">{channel.whatsapp_number ? `Public WhatsApp: ${channel.whatsapp_number}` : channel.phone_reference ? `Phone reference only: ${channel.phone_reference}` : "No public WhatsApp number. Keep Email as recommended channel."}</p></div></div></div>
                <Field label="Recommended channel"><select value={edit.recommended_channel} onChange={(event) => updateEdit(setEdits, activeMessage.id, { recommended_channel: event.target.value })} className="approval-input"><option value="Email">Email</option>{channel.whatsapp_number && <option value="WhatsApp">WhatsApp</option>}</select></Field>
                <Field label="WhatsApp message"><textarea rows={10} value={edit.whatsapp_text} onChange={(event) => updateEdit(setEdits, activeMessage.id, { whatsapp_text: event.target.value })} className="approval-input resize-y" placeholder="Prepare missing WhatsApp draft above." /></Field>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyText(edit.whatsapp_text, "WhatsApp draft copied")} disabled={!edit.whatsapp_text.trim()} className="inline-flex min-h-10 items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-35"><ClipboardCopy size={12} /> Copy WhatsApp</button><button type="button" onClick={() => openWhatsApp(channel.whatsapp_number, edit.whatsapp_text)} disabled={!canOpenWhatsApp} className="inline-flex min-h-10 items-center gap-2 border border-emerald-500/50 px-3 text-[9px] uppercase tracking-[0.14em] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-35"><ExternalLink size={12} /> Open WhatsApp</button></div>
                <div className="border border-border/50 bg-background/20 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-gold">Evidence & safeguards</p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[10px] text-foreground/60">{JSON.stringify({ email: activeMessage.personalization_evidence, channel }, null, 2)}</pre></div>
                <div className="grid gap-2 sm:grid-cols-3"><button type="button" onClick={() => void savePackage(activeMessage, "draft")} disabled={Boolean(busy)} className="inline-flex min-h-12 items-center justify-center gap-2 border border-border/60 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40"><RefreshCw size={12} /> Save</button><button type="button" onClick={() => void savePackage(activeMessage, "rejected")} disabled={Boolean(busy)} className="inline-flex min-h-12 items-center justify-center gap-2 border border-red-500/50 text-[9px] uppercase tracking-[0.14em] text-red-300 disabled:opacity-40"><XCircle size={12} /> Reject & Next</button><button type="button" onClick={() => void savePackage(activeMessage, "approved")} disabled={Boolean(busy)} className="inline-flex min-h-12 items-center justify-center gap-2 bg-gradient-gold text-[9px] uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40">{busy === `save:${activeMessage.id}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve & Next</button></div>
                <p className="text-center text-[10px] text-muted-foreground">Approval queues the exact email. It does not send email or WhatsApp.</p>
              </div>
            </div>;
          })()}
        </section>
      </div>
      <style>{`.approval-input{width:100%;min-height:2.85rem;background:hsl(var(--input));border:1px solid hsl(var(--border));padding:.65rem .75rem;font-size:.78rem;outline:none}.approval-input:focus{border-color:hsl(var(--primary))}`}</style>
    </main>
  );
}

function candidateBlockers(candidate: Candidate) {
  const blockers: string[] = [];
  if (!validEmail(candidate.email)) blockers.push("email");
  if (!candidate.website?.trim() && !candidate.website_domain?.trim()) blockers.push("website");
  if (!candidate.buyer_type?.trim()) blockers.push("buyer type");
  if (!candidate.product_fit?.length) blockers.push("product fit");
  if (!candidate.source_url?.trim()) blockers.push("source");
  if (!isRecord(candidate.evidence) || !Object.keys(candidate.evidence).length) blockers.push("evidence");
  if (!Number.isFinite(candidate.verification_score) || candidate.verification_score < 70) blockers.push("score 70+");
  return blockers;
}

function isEligibleLead(lead: Lead) {
  return validEmail(lead.email) && !lead.outreach_opt_out && ((typeof lead.verification_score === "number" && lead.verification_score >= 70) || ELIGIBLE_CRM_STATUSES.has(lead.crm_status || ""));
}

function normalizeMessage(message: OutreachMessage): OutreachMessage {
  return { ...message, personalization_evidence: isRecord(message.personalization_evidence) ? message.personalization_evidence : {}, b2b_leads: message.b2b_leads || null };
}

function channelData(message: OutreachMessage) {
  const root = isRecord(message.personalization_evidence) ? message.personalization_evidence : {};
  const channel = isRecord(root.channel_copilot) ? root.channel_copilot : {};
  return {
    whatsapp_text: text(channel.whatsapp_text),
    whatsapp_number: text(channel.whatsapp_number) || text(message.b2b_leads?.whatsapp),
    phone_reference: text(channel.phone_reference) || text(message.b2b_leads?.phone),
    recommended_channel: text(channel.recommended_channel) || "Email",
    send_window: text(channel.send_window) || "Buyer local business hours",
    risk_flags: Array.isArray(channel.risk_flags) ? channel.risk_flags : [],
    personalization_evidence: Array.isArray(channel.personalization_evidence) ? channel.personalization_evidence : [],
    send_capability: false,
  };
}

function packageEdit(message: OutreachMessage): PackageEdit {
  const channel = channelData(message);
  return { subject: message.subject, body_text: message.body_text, language: message.language, whatsapp_text: channel.whatsapp_text, recommended_channel: channel.recommended_channel };
}

function nextReviewMessage(messages: OutreachMessage[]) { return messages.find((message) => ["draft", "failed", "rejected"].includes(message.status)) || messages[0] || null; }
function nextAfter(messages: OutreachMessage[], id: string) { const index = messages.findIndex((message) => message.id === id); return messages[index + 1] || messages.find((message) => ["draft", "failed", "rejected"].includes(message.status) && message.id !== id) || null; }
function splitList(value: string) { return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))]; }
function validEmail(value: string | null) { return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function toggleSet(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }
function updateEdit(setter: React.Dispatch<React.SetStateAction<Record<string, PackageEdit>>>, id: string, patch: Partial<PackageEdit>) { setter((current) => ({ ...current, [id]: { ...current[id], ...patch } })); }
function whatsappUrl(number: string, message: string) { const digits = number.replace(/\D/g, ""); return digits.length >= 8 && digits.length <= 16 && message.trim() ? `https://wa.me/${digits}?text=${encodeURIComponent(message.trim())}` : ""; }
function openWhatsApp(number: string, message: string) { const url = whatsappUrl(number, message); if (url) window.open(url, "_blank", "noopener,noreferrer"); }
async function copyText(value: string, title: string) { if (!value.trim()) return; await navigator.clipboard.writeText(value); toast({ title }); }
function csvCell(value: unknown) { const raw = value == null ? "" : String(value); const safe = /^[\t\r\n ]*[=+\-@]/.test(raw) ? `'${raw}` : raw; return `"${safe.replace(/"/g, '""')}"`; }
function downloadCsv(filename: string, headers: string[], rows: unknown[][]) { const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"); const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>{children}</label>; }
function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="border border-border/60 bg-card/30 p-4"><div className="flex items-center gap-2 text-gold">{icon}<p className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p></div><p className="mt-2 font-display text-2xl tabular-nums">{value.toLocaleString()}</p></div>; }
function MiniMetric({ label, value }: { label: string; value: number }) { return <div className="border border-border/50 bg-background/20 p-3 text-center"><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-lg">{value}</p></div>; }
function RuntimeFlag({ label, active }: { label: string; active: boolean }) { return <span className={`border px-2 py-1 uppercase tracking-[0.12em] ${active ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}>{label}</span>; }
function StatusBadge({ status }: { status: string }) { const good = ["approved", "sent", "replied"].includes(status); const bad = ["failed", "rejected", "suppressed"].includes(status); return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.13em] ${good ? "border-emerald-500/40 text-emerald-300" : bad ? "border-red-500/40 text-red-300" : "border-amber-500/40 text-amber-300"}`}>{status}</span>; }
function Centered({ children }: { children: React.ReactNode }) { return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{children}</div>; }
