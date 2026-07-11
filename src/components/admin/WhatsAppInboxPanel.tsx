import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  businessRulesApproved,
  containsHighRiskBusinessTerms,
  loadBusinessRules,
} from "@/lib/businessRules";
import {
  whatsappConversationNeedsAttention,
  whatsappStatusTone,
  type WhatsAppOptInStatus,
} from "@/lib/whatsappInbox";

const MIGRATION = "supabase/migrations/20260712230000_whatsapp_business_inbox.sql";
const db = supabase as any;

type Contact = {
  id: string;
  wa_id: string;
  phone_e164: string | null;
  profile_name: string | null;
  language_code: string | null;
  crm_lead_id: string | null;
  opt_in_status: WhatsAppOptInStatus;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
};

type Conversation = {
  id: string;
  contact_id: string;
  status: string;
  unread_count: number;
  qualification_status: string;
  last_summary: string | null;
  last_message_at: string | null;
  contact: Contact;
};

type Message = {
  id: string;
  wa_message_id: string | null;
  direction: "inbound" | "outbound";
  message_type: string;
  body: string | null;
  status: string;
  requires_owner_approval: boolean;
  error: string | null;
  received_at: string | null;
  sent_at: string | null;
  created_at: string;
};

type Health = {
  ready?: boolean;
  state?: string;
  configuration?: Record<string, boolean>;
  tables?: Record<string, boolean>;
  errors?: string[];
};

export default function WhatsAppInboxPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draftBody, setDraftBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const rules = loadBusinessRules();
  const rulesApproved = businessRulesApproved(rules);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("whatsapp_conversations")
      .select("id,contact_id,status,unread_count,qualification_status,last_summary,last_message_at,contact:whatsapp_contacts(id,wa_id,phone_e164,profile_name,language_code,crm_lead_id,opt_in_status,last_inbound_at,last_outbound_at)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(300);
    if (error) {
      setBackendError(error.message || "WhatsApp inbox backend unavailable");
      setConversations([]);
      setLoading(false);
      return;
    }
    const rows = ((data ?? []) as unknown as Conversation[]).filter((row) => row.contact);
    setBackendError(null);
    setConversations(rows);
    setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? "");
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setMessageLoading(true);
    const { data, error } = await db
      .from("whatsapp_messages")
      .select("id,wa_message_id,direction,message_type,body,status,requires_owner_approval,error,received_at,sent_at,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) toast({ title: "Messages unavailable", description: error.message, variant: "destructive" });
    setMessages((data ?? []) as Message[]);
    setMessageLoading(false);
  }, []);

  const runHealth = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("whatsapp-admin", { body: { action: "health" } });
    if (error) {
      setHealth({ ready: false, state: "blocked", errors: [error.message] });
      return;
    }
    setHealth((data ?? {}) as Health);
  }, []);

  useEffect(() => { void loadConversations(); void runHealth(); }, [loadConversations, runHealth]);
  useEffect(() => { void loadMessages(selectedId); }, [loadMessages, selectedId]);

  const selected = conversations.find((row) => row.id === selectedId) ?? null;
  const attentionCount = useMemo(() => conversations.filter((row) => whatsappConversationNeedsAttention({
    unreadCount: row.unread_count,
    status: row.status,
    qualificationStatus: row.qualification_status,
  })).length, [conversations]);
  const commitmentDetected = containsHighRiskBusinessTerms(draftBody);

  const createDraft = async () => {
    if (!selected || !draftBody.trim()) return;
    const { data, error } = await supabase.functions.invoke("whatsapp-admin", {
      body: { action: "create_draft", conversation_id: selected.id, body: draftBody.trim(), message_type: "text" },
    });
    if (error || data?.ok !== true) {
      toast({ title: "Draft creation failed", description: error?.message || data?.error || "Backend unavailable", variant: "destructive" });
      return;
    }
    toast({ title: "WhatsApp draft created", description: "The message has not been sent." });
    setDraftBody("");
    await loadMessages(selected.id);
  };

  const sendApproved = async (message: Message) => {
    if (!rulesApproved) {
      toast({ title: "Business Rules approval required", variant: "destructive" });
      return;
    }
    if (!window.confirm("Send this exact WhatsApp draft now? This is an external buyer message and will be recorded with owner approval.")) return;
    const { data, error } = await supabase.functions.invoke("whatsapp-admin", {
      body: { action: "send_approved", message_id: message.id },
    });
    if (error || data?.ok !== true) {
      toast({ title: "WhatsApp send not completed", description: error?.message || data?.error || "No verified send result", variant: "destructive" });
      await loadMessages(selectedId);
      return;
    }
    toast({ title: "WhatsApp API confirmed the send", description: data?.wa_message_id ? `Message ID: ${data.wa_message_id}` : "Send recorded." });
    await loadMessages(selectedId);
    await loadConversations();
  };

  const markRead = async () => {
    if (!selected) return;
    const { data, error } = await supabase.functions.invoke("whatsapp-admin", { body: { action: "mark_read", conversation_id: selected.id } });
    if (error || data?.ok !== true) {
      toast({ title: "Could not mark read", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    await loadConversations();
  };

  if (backendError) {
    return (
      <section className="border border-amber-500/35 bg-amber-500/[0.05] p-6 md:p-8">
        <div className="flex items-start gap-4">
          <AlertTriangle size={22} className="text-amber-300 shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">WhatsApp Business</p>
            <h2 className="font-display text-2xl md:text-3xl">Backend activation pending</h2>
            <p className="text-sm text-foreground/65 mt-3 max-w-3xl leading-relaxed">
              The signed webhook, CRM link, inbox and owner-approved send source are code-ready. Apply the migration and deploy the two functions during the single final activation batch.
            </p>
            <code className="mt-4 block text-xs text-amber-200">{MIGRATION}</code>
            <p className="mt-2 text-xs text-foreground/45">Functions: whatsapp-webhook · whatsapp-admin</p>
            <p className="mt-3 text-xs text-foreground/45 break-all">Runtime evidence: {backendError}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="border border-border/60 bg-card/25 p-4 md:p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <MessageCircle size={20} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">WhatsApp Business Inbox</p>
            <h2 className="font-display text-2xl md:text-3xl">Inbound buyer conversations</h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-3xl">No silent auto-replies. Inbound messages create evidence; outbound messages require a draft and explicit owner-approved API result.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge label={`${attentionCount} attention`} active={attentionCount > 0} />
          <Badge label={health?.ready ? "Runtime ready" : `Runtime ${health?.state || "unchecked"}`} active={health?.ready === true} />
          <button type="button" onClick={() => { void loadConversations(); void runHealth(); }} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><RefreshCw size={12} /> Refresh</button>
        </div>
      </section>

      {!rulesApproved && (
        <div className="border border-amber-500/30 bg-amber-500/[0.05] p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/60"><span className="text-amber-200">Plan/draft only.</span> Approve complete Business Rules before external WhatsApp sending.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-5 min-h-[620px]">
        <aside className="border border-border/60 bg-card/20 overflow-hidden">
          <div className="p-3 border-b border-border/60 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Conversations · {conversations.length}</div>
          <div className="max-h-[620px] overflow-y-auto">
            {loading ? <p className="p-5 text-sm text-muted-foreground">Loading…</p> : conversations.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No signed inbound WhatsApp messages yet.</p> : conversations.map((row) => {
              const attention = whatsappConversationNeedsAttention({ unreadCount: row.unread_count, status: row.status, qualificationStatus: row.qualification_status });
              return (
                <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`w-full text-left p-4 border-b border-border/40 hover:bg-card/40 ${selectedId === row.id ? "bg-gold/[0.06] border-l-2 border-l-gold" : "border-l-2 border-l-transparent"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-sm truncate">{row.contact.profile_name || row.contact.phone_e164 || row.contact.wa_id}</p>
                    {row.unread_count > 0 && <span className="min-w-6 h-6 rounded-full bg-gold text-background text-[10px] flex items-center justify-center">{row.unread_count}</span>}
                  </div>
                  <p className="text-[10px] text-foreground/45 mt-1 truncate">{row.contact.phone_e164 || row.contact.wa_id}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`text-[9px] uppercase tracking-[0.12em] ${attention ? "text-amber-300" : "text-emerald-300"}`}>{row.status.replace(/_/g, " ")}</span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-foreground/40">{row.qualification_status.replace(/_/g, " ")}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="border border-border/60 bg-card/20 min-w-0 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a conversation.</div>
          ) : (
            <>
              <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-display text-xl">{selected.contact.profile_name || selected.contact.phone_e164 || selected.contact.wa_id}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/45 mt-1">{selected.contact.opt_in_status.replace(/_/g, " ")} · {selected.contact.crm_lead_id ? "CRM linked" : "CRM link pending"}</p>
                </div>
                <button type="button" onClick={() => void markRead()} className="min-h-10 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><UserRoundCheck size={12} /> Mark read</button>
              </div>

              <div className="flex-1 p-4 space-y-3 max-h-[410px] overflow-y-auto">
                {messageLoading ? <p className="text-sm text-muted-foreground">Loading messages…</p> : messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages.</p> : messages.map((message) => <MessageBubble key={message.id} message={message} onSend={sendApproved} rulesApproved={rulesApproved} />)}
              </div>

              <div className="border-t border-border/60 p-4">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">New reviewed draft</span>
                  <textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} rows={4} placeholder="Paste a reviewed safe draft from Buyer Reply Studio or write an owner-reviewed message." className="mt-2 w-full bg-background border border-border/60 px-3 py-2 text-sm resize-y" />
                </label>
                {commitmentDetected && <p className="mt-2 text-xs text-red-300">Commercial commitment language detected. Server execution will block this message.</p>}
                <div className="mt-3 flex justify-between gap-3 flex-wrap text-[10px] text-foreground/45">
                  <span>Creating a draft does not send it.</span>
                  <button type="button" onClick={() => void createDraft()} disabled={!draftBody.trim()} className="min-h-10 inline-flex items-center gap-2 bg-gold text-background px-4 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40"><ShieldCheck size={12} /> Create approval draft</button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function MessageBubble({ message, onSend, rulesApproved }: { message: Message; onSend: (message: Message) => Promise<void>; rulesApproved: boolean }) {
  const outbound = message.direction === "outbound";
  const tone = whatsappStatusTone(message.status);
  const statusClass = tone === "error" ? "text-red-300" : tone === "attention" ? "text-amber-300" : tone === "ok" ? "text-emerald-300" : "text-foreground/40";
  return (
    <div className={`max-w-[86%] border p-3 ${outbound ? "ml-auto border-gold/30 bg-gold/[0.04]" : "mr-auto border-border/60 bg-background/50"}`}>
      <div className="flex justify-between gap-4 text-[9px] uppercase tracking-[0.12em] text-foreground/40">
        <span>{message.direction} · {message.message_type}</span>
        <span className={statusClass}>{message.status}</span>
      </div>
      <p className="text-sm text-foreground/72 mt-2 whitespace-pre-wrap break-words">{message.body || `[${message.message_type}]`}</p>
      {message.error && <p className="text-xs text-red-300 mt-2 break-all">{message.error}</p>}
      {outbound && ["draft", "approved", "failed"].includes(message.status) && (
        <button type="button" onClick={() => void onSend(message)} disabled={!rulesApproved} className="mt-3 min-h-9 inline-flex items-center gap-2 border border-gold/40 px-3 text-[9px] uppercase tracking-[0.14em] text-gold disabled:opacity-40"><Send size={11} /> Owner approve & send</button>
      )}
    </div>
  );
}

function Badge({ label, active }: { label: string; active: boolean }) {
  return <span className={`min-h-10 inline-flex items-center gap-2 border px-3 text-[9px] uppercase tracking-[0.14em] ${active ? "border-emerald-500/35 text-emerald-300" : "border-amber-500/35 text-amber-300"}`}>{active ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}{label}</span>;
}
