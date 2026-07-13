import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type QueueStatus = "draft" | "approved" | "failed";

type Contact = {
  id: string;
  wa_id: string;
  phone_e164: string | null;
  profile_name: string | null;
  opt_in_status: string;
  last_inbound_at: string | null;
};

type QueueMessage = {
  id: string;
  conversation_id: string;
  contact_id: string;
  direction: "outbound";
  message_type: "text" | "template";
  body: string | null;
  template_name: string | null;
  template_language: string | null;
  status: QueueStatus;
  requires_owner_approval: boolean;
  approved_at: string | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  contact: Contact;
};

type Health = {
  ready?: boolean;
  state?: string;
  configuration?: Record<string, boolean>;
  tables?: Record<string, boolean>;
  errors?: string[];
  error?: string;
};

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast({ title: "WhatsApp draft copied" });
  } catch {
    toast({ title: "Copy failed", description: "Select and copy the message manually.", variant: "destructive" });
  }
}

function messagePreview(message: QueueMessage) {
  if (message.message_type === "template") {
    return `Approved template: ${message.template_name || "missing"} · ${message.template_language || "language missing"}`;
  }
  return message.body || "Empty text draft";
}

function displayContact(message: QueueMessage) {
  return message.contact?.profile_name || message.contact?.phone_e164 || message.contact?.wa_id || "WhatsApp contact";
}

function displayNumber(message: QueueMessage) {
  return message.contact?.phone_e164 || message.contact?.wa_id || "Number unavailable";
}

export default function AdminWhatsAppQuick() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [queueResult, healthResult] = await Promise.all([
      db
        .from("whatsapp_messages")
        .select("id,conversation_id,contact_id,direction,message_type,body,template_name,template_language,status,requires_owner_approval,approved_at,sent_at,error,created_at,updated_at,contact:whatsapp_contacts(id,wa_id,phone_e164,profile_name,opt_in_status,last_inbound_at)")
        .eq("direction", "outbound")
        .in("status", ["draft", "approved", "failed"])
        .order("updated_at", { ascending: false })
        .limit(250),
      supabase.functions.invoke("whatsapp-admin", { body: { action: "health" } }),
    ]);

    if (queueResult.error) {
      setMessages([]);
      toast({ title: "WhatsApp approval queue could not load", description: queueResult.error.message, variant: "destructive" });
    } else {
      setMessages(((queueResult.data || []) as unknown as QueueMessage[]).filter((message) => Boolean(message.contact)));
    }

    setHealth(healthResult.error ? { ready: false, state: "blocked", error: healthResult.error.message } : (healthResult.data as Health));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && isAdmin) void load();
  }, [user, isAdmin, load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((message) => [
      displayContact(message),
      displayNumber(message),
      message.body,
      message.template_name,
      message.template_language,
      message.status,
      message.contact?.opt_in_status,
    ].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [messages, query]);

  const sendOne = async (message: QueueMessage) => {
    if (!health?.ready) {
      toast({
        title: "WhatsApp Business API is not ready",
        description: health?.error || health?.errors?.join(" · ") || "Complete the official Meta runtime configuration first.",
        variant: "destructive",
      });
      return;
    }

    const contactName = displayContact(message);
    const number = displayNumber(message);
    const preview = messagePreview(message);
    const confirmed = window.confirm(
      `OK and send exactly one WhatsApp message now?\n\nContact: ${contactName}\nNumber: ${number}\nType: ${message.message_type}\n\n${preview}\n\nThis external buyer message is irreversible.`,
    );
    if (!confirmed) return;

    setBusyId(message.id);
    const { data, error } = await supabase.functions.invoke("whatsapp-admin", {
      body: { action: "send_approved", message_id: message.id },
    });
    setBusyId(null);

    if (error || data?.ok !== true || data?.sent !== true) {
      toast({
        title: "WhatsApp message was not sent",
        description: data?.error || error?.message || "No verified WhatsApp API send result was returned.",
        variant: "destructive",
      });
      await load();
      return;
    }

    toast({
      title: "WhatsApp API confirmed the send",
      description: data?.wa_message_id ? `${contactName} · Message ID ${data.wa_message_id}` : contactName,
    });
    await load();
  };

  if (authLoading) return <Centered>Loading secure WhatsApp queue…</Centered>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Centered>Admin access is required.</Centered>;

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <SEO title="Quick WhatsApp Approval — Irha Apparels" description="Private owner WhatsApp approval queue." path="/admin/whatsapp-quick" noindex />
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Owner-only · Official WhatsApp Business</p>
              <h1 className="font-display text-3xl sm:text-4xl mt-2">Quick WhatsApp Approval Queue</h1>
              <p className="text-sm text-foreground/70 mt-3 max-w-3xl leading-relaxed">
                Review an existing contact-linked draft and press OK & Send for exactly one official API message. Opt-out, blocked-contact, approved-template, customer-service-window, Business Rules and commercial-commitment checks remain enforced by the private backend.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/admin" className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><ArrowLeft size={12} /> Full Admin</a>
              <button type="button" onClick={() => void load()} disabled={loading || busyId !== null} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold disabled:opacity-40"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
            </div>
          </div>
        </header>

        <HealthBanner health={health} />

        <section className="grid sm:grid-cols-3 gap-3">
          <Metric label="Drafts" value={messages.filter((message) => message.status === "draft").length} />
          <Metric label="Approved" value={messages.filter((message) => message.status === "approved").length} />
          <Metric label="Failed retry" value={messages.filter((message) => message.status === "failed").length} />
        </section>

        <label className="block border border-border/60 bg-card/30 p-3">
          <span className="sr-only">Search WhatsApp approval queue</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contact, number, template or message…" className="w-full bg-transparent outline-none text-sm" />
        </label>

        {loading ? (
          <Centered>Loading WhatsApp approval queue…</Centered>
        ) : filtered.length === 0 ? (
          <section className="border border-dashed border-border/60 p-10 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-300" />
            <h2 className="font-display text-2xl mt-3">No pending WhatsApp drafts</h2>
            <p className="text-sm text-muted-foreground mt-2">Open the full WhatsApp inbox to review an inbound conversation and create a contact-linked draft first.</p>
          </section>
        ) : (
          <section className="space-y-4">
            {filtered.map((message) => {
              const contactName = displayContact(message);
              const number = displayNumber(message);
              const preview = messagePreview(message);
              const blocked = ["opted_out", "blocked"].includes(message.contact?.opt_in_status || "");
              const isBusy = busyId === message.id;
              return (
                <article key={message.id} className={`border p-4 sm:p-6 ${message.status === "approved" ? "border-emerald-500/40 bg-emerald-500/[0.035]" : message.status === "failed" ? "border-red-500/40 bg-red-500/[0.03]" : "border-border/60 bg-card/30"}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Status status={message.status} />
                        <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{message.message_type}</span>
                        <span className={`text-[9px] uppercase tracking-[0.14em] ${blocked ? "text-red-300" : "text-emerald-300"}`}>{message.contact?.opt_in_status || "opt-in unknown"}</span>
                      </div>
                      <h2 className="font-display text-2xl mt-2">{contactName}</h2>
                      <p className="text-xs text-gold mt-1">{number}</p>
                    </div>
                    <button type="button" onClick={() => void copyText(preview)} className="min-h-10 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><Copy size={11} /> Copy</button>
                  </div>

                  <div className="mt-5 border border-border/50 bg-background/30 p-4">
                    {message.message_type === "template" ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Info label="Approved template" value={message.template_name || "Missing"} />
                        <Info label="Language" value={message.template_language || "Missing"} />
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{message.body || "Empty text draft"}</p>
                    )}
                  </div>

                  {message.error && <p className="text-xs text-red-300 mt-3">Last error: {message.error}</p>}
                  {message.approved_at && <p className="text-[10px] text-emerald-300 mt-3">Previously approved {new Date(message.approved_at).toLocaleString()}</p>}

                  <div className="grid sm:grid-cols-2 gap-2 mt-5">
                    <button type="button" onClick={() => void sendOne(message)} disabled={isBusy || busyId !== null || !health?.ready || blocked} className="min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 text-[11px] uppercase tracking-[0.16em] font-semibold disabled:opacity-40">
                      {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} OK & Send 1 WhatsApp
                    </button>
                    <a href="/admin" className="min-h-12 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><ExternalLink size={12} /> Full WhatsApp inbox</a>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function HealthBanner({ health }: { health: Health | null }) {
  if (!health) return <div className="border border-border/60 bg-card/30 p-4 text-sm text-muted-foreground">Checking official WhatsApp runtime…</div>;
  if (health.error) return <div className="border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-300"><AlertTriangle size={16} className="inline mr-2" />{health.error}</div>;
  const ready = Boolean(health.ready);
  return (
    <div className={`border p-4 flex items-start gap-3 ${ready ? "border-emerald-500/35 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>
      {ready ? <ShieldCheck size={18} className="text-emerald-300 shrink-0" /> : <AlertTriangle size={18} className="text-amber-300 shrink-0" />}
      <div>
        <p className="font-medium text-sm">{ready ? "Official WhatsApp Business runtime ready" : `WhatsApp runtime ${health.state || "not ready"}`}</p>
        <p className="text-xs text-foreground/65 mt-1">{ready ? "Every external send still requires this owner confirmation." : health.errors?.join(" · ") || "Complete the Meta Cloud API and signed-webhook configuration first."}</p>
      </div>
    </div>
  );
}

function Status({ status }: { status: QueueStatus }) {
  const className = status === "approved" ? "border-emerald-500/45 text-emerald-300" : status === "failed" ? "border-red-500/45 text-red-300" : "border-amber-500/45 text-amber-300";
  return <span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${className}`}>{status}</span>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-border/60 bg-card/30 p-4"><p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="text-sm mt-1 break-all">{value}</p></div>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">{children}</div>;
}
