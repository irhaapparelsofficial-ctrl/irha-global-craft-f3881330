import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type QueueStatus = "draft" | "approved" | "failed";

type QueueMessage = {
  id: string;
  campaign_id: string;
  lead_id: string;
  recipient_email: string;
  recipient_company: string;
  language: string;
  subject: string;
  body_text: string;
  status: QueueStatus;
  approved_by: string | null;
  approved_at: string | null;
  error: string | null;
  sequence_number: number;
  created_at: string;
  updated_at: string;
};

type MessageEdit = {
  subject: string;
  body_text: string;
  language: string;
};

type Health = {
  ready_to_send?: boolean;
  ready_to_generate?: boolean;
  gmail_verified?: boolean;
  gmail_profile?: { emailAddress?: string | null } | null;
  gmail_error?: string | null;
  approval_policy?: string;
  error?: string;
};

function summarize(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value as Record<string, unknown>)
    .map(([key, count]) => `${String(count)} ${key.replace(/_/g, " ")}`)
    .join(" · ");
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast({ title: "Message copied" });
  } catch {
    toast({ title: "Copy failed", description: "Select and copy the message manually.", variant: "destructive" });
  }
}

export default function AdminOutreachQuick() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [edits, setEdits] = useState<Record<string, MessageEdit>>({});
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [queueResult, healthResult] = await Promise.all([
      db
        .from("outreach_messages")
        .select("id,campaign_id,lead_id,recipient_email,recipient_company,language,subject,body_text,status,approved_by,approved_at,error,sequence_number,created_at,updated_at")
        .in("status", ["draft", "approved", "failed"])
        .order("updated_at", { ascending: false })
        .limit(250),
      supabase.functions.invoke("outreach-engine", { body: { action: "health" } }),
    ]);

    if (queueResult.error) {
      toast({ title: "Approval queue could not load", description: queueResult.error.message, variant: "destructive" });
      setMessages([]);
    } else {
      const rows = (queueResult.data || []) as QueueMessage[];
      setMessages(rows);
      setEdits(Object.fromEntries(rows.map((message) => [message.id, {
        subject: message.subject,
        body_text: message.body_text,
        language: message.language,
      }])));
    }

    setHealth(healthResult.error ? { error: healthResult.error.message } : (healthResult.data as Health));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && isAdmin) void load();
  }, [user, isAdmin, load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((message) => [
      message.recipient_company,
      message.recipient_email,
      message.subject,
      message.body_text,
      message.status,
    ].join(" ").toLowerCase().includes(needle));
  }, [messages, query]);

  const updateEdit = (id: string, patch: Partial<MessageEdit>) => {
    setEdits((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const approveOnly = async (message: QueueMessage) => {
    const edit = edits[message.id];
    if (!edit?.subject.trim() || !edit?.body_text.trim()) {
      toast({ title: "Subject and message are required", variant: "destructive" });
      return false;
    }

    const { data, error } = await supabase.functions.invoke("outreach-engine", {
      body: {
        action: "update",
        message_id: message.id,
        subject: edit.subject,
        body_text: edit.body_text,
        language: edit.language,
        status: "approved",
      },
    });
    if (error || !data?.ok) {
      toast({ title: "Approval failed", description: data?.error || error?.message || "Unknown approval error", variant: "destructive" });
      return false;
    }
    return true;
  };

  const okAndSend = async (message: QueueMessage) => {
    if (!health?.ready_to_send) {
      toast({ title: "Gmail is not ready", description: health?.gmail_error || health?.error || "Verify the Gmail connector first.", variant: "destructive" });
      return;
    }

    const edit = edits[message.id];
    if (!edit?.subject.trim() || !edit?.body_text.trim()) {
      toast({ title: "Subject and message are required", variant: "destructive" });
      return;
    }

    const confirmed = window.confirm(
      `OK and send exactly one email now?\n\nCompany: ${message.recipient_company}\nTo: ${message.recipient_email}\nSubject: ${edit.subject}\n\nThis Gmail send is irreversible.`,
    );
    if (!confirmed) return;

    setBusyId(message.id);
    const approved = await approveOnly(message);
    if (!approved) {
      setBusyId(null);
      return;
    }

    const { data, error } = await supabase.functions.invoke("outreach-engine", {
      body: { action: "send", message_ids: [message.id] },
    });
    setBusyId(null);

    if (error) {
      toast({ title: "Gmail send request failed", description: error.message, variant: "destructive" });
      await load();
      return;
    }

    const outcome = Array.isArray(data?.outcomes) ? data.outcomes[0] : null;
    if (outcome?.status === "sent") {
      toast({
        title: outcome.recovered ? "Email already existed — safely recovered" : "Email sent",
        description: `${message.recipient_company} · ${message.recipient_email}`,
      });
    } else {
      toast({
        title: "Email was not sent",
        description: outcome?.reason || outcome?.error || summarize(data?.summary) || data?.error || "Review the saved status.",
        variant: "destructive",
      });
    }
    await load();
  };

  const reject = async (message: QueueMessage) => {
    if (!window.confirm(`Reject this draft for ${message.recipient_company}?`)) return;
    setBusyId(message.id);
    const edit = edits[message.id];
    const { data, error } = await supabase.functions.invoke("outreach-engine", {
      body: {
        action: "update",
        message_id: message.id,
        subject: edit?.subject || message.subject,
        body_text: edit?.body_text || message.body_text,
        language: edit?.language || message.language,
        status: "rejected",
      },
    });
    setBusyId(null);
    if (error || !data?.ok) {
      toast({ title: "Reject failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Draft rejected" });
    await load();
  };

  if (authLoading) return <Centered>Loading secure approval queue…</Centered>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Centered>Admin access is required.</Centered>;

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <SEO title="Quick Email Approval — Irha Apparels" description="Private owner email approval queue." path="/admin/outreach-quick" noindex />
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Owner-only · One message per approval</p>
              <h1 className="font-display text-3xl sm:text-4xl mt-2">Quick Email Approval Queue</h1>
              <p className="text-sm text-foreground/70 mt-3 max-w-3xl leading-relaxed">
                Review the company, subject and message. Press OK & Send to save explicit approval and send exactly one Gmail message through the duplicate-safe outreach engine.
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
          <Metric label="Ready for review" value={messages.filter((item) => item.status === "draft").length} />
          <Metric label="Approved" value={messages.filter((item) => item.status === "approved").length} />
          <Metric label="Failed retry" value={messages.filter((item) => item.status === "failed").length} />
        </section>

        <label className="block border border-border/60 bg-card/30 p-3">
          <span className="sr-only">Search approval queue</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, email, subject or message…" className="w-full bg-transparent outline-none text-sm" />
        </label>

        {loading ? (
          <Centered>Loading approval queue…</Centered>
        ) : filtered.length === 0 ? (
          <section className="border border-dashed border-border/60 p-10 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-300" />
            <h2 className="font-display text-2xl mt-3">No pending email drafts</h2>
            <p className="text-sm text-muted-foreground mt-2">Use Email & Follow-ups in the full admin to generate drafts from verified Buyer CRM companies.</p>
          </section>
        ) : (
          <section className="space-y-4">
            {filtered.map((message) => {
              const edit = edits[message.id] || { subject: message.subject, body_text: message.body_text, language: message.language };
              const isBusy = busyId === message.id;
              return (
                <article key={message.id} className={`border p-4 sm:p-6 ${message.status === "approved" ? "border-emerald-500/40 bg-emerald-500/[0.035]" : message.status === "failed" ? "border-red-500/40 bg-red-500/[0.03]" : "border-border/60 bg-card/30"}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Status status={message.status} />
                        <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{message.sequence_number === 0 ? "Initial email" : `Follow-up ${message.sequence_number}`}</span>
                      </div>
                      <h2 className="font-display text-2xl mt-2">{message.recipient_company}</h2>
                      <p className="text-xs text-gold mt-1">{message.recipient_email}</p>
                    </div>
                    <button type="button" onClick={() => void copyText(`${edit.subject}\n\n${edit.body_text}`)} className="min-h-10 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><Copy size={11} /> Copy</button>
                  </div>

                  <div className="grid lg:grid-cols-[180px_minmax(0,1fr)] gap-3 mt-5">
                    <label><span className="block text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Language</span><input value={edit.language} onChange={(event) => updateEdit(message.id, { language: event.target.value })} className="quick-input" /></label>
                    <label><span className="block text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Subject</span><input value={edit.subject} onChange={(event) => updateEdit(message.id, { subject: event.target.value })} className="quick-input" /></label>
                  </div>
                  <label className="block mt-3"><span className="block text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Message</span><textarea rows={10} value={edit.body_text} onChange={(event) => updateEdit(message.id, { body_text: event.target.value })} className="quick-input resize-y leading-relaxed" /></label>

                  {message.error && <p className="text-xs text-red-300 mt-3">Last error: {message.error}</p>}
                  {message.approved_at && <p className="text-[10px] text-emerald-300 mt-3">Previously approved {new Date(message.approved_at).toLocaleString()}</p>}

                  <div className="grid sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_auto_auto] gap-2 mt-5">
                    <button type="button" onClick={() => void okAndSend(message)} disabled={isBusy || busyId !== null || !health?.ready_to_send} className="min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 text-[11px] uppercase tracking-[0.16em] font-semibold disabled:opacity-40">
                      {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} OK & Send 1 Email
                    </button>
                    <button type="button" onClick={() => void reject(message)} disabled={busyId !== null} className="min-h-12 inline-flex items-center justify-center gap-2 border border-red-500/45 text-red-300 px-4 text-[10px] uppercase tracking-[0.14em] disabled:opacity-40"><XCircle size={12} /> Skip</button>
                    <a href="/admin" className="min-h-12 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"><ExternalLink size={12} /> Full workspace</a>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
      <style>{`.quick-input{width:100%;background:hsl(var(--input));border:1px solid hsl(var(--border));padding:.7rem .8rem;font-size:.8rem;outline:none}.quick-input:focus{border-color:hsl(var(--primary))}`}</style>
    </main>
  );
}

function HealthBanner({ health }: { health: Health | null }) {
  if (!health) return <div className="border border-border/60 bg-card/30 p-4 text-sm text-muted-foreground">Checking Gmail and outreach engine…</div>;
  if (health.error) return <div className="border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-300"><AlertTriangle size={16} className="inline mr-2" />{health.error}</div>;
  const ready = Boolean(health.ready_to_send);
  return (
    <div className={`border p-4 flex items-start gap-3 ${ready ? "border-emerald-500/35 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>
      {ready ? <ShieldCheck size={18} className="text-emerald-300 shrink-0" /> : <AlertTriangle size={18} className="text-amber-300 shrink-0" />}
      <div>
        <p className="font-medium text-sm">{ready ? `Gmail ready${health.gmail_profile?.emailAddress ? ` · ${health.gmail_profile.emailAddress}` : ""}` : health.ready_to_generate ? "AI drafts ready; Gmail sending not verified" : "Outreach engine needs configuration"}</p>
        <p className="text-xs text-foreground/65 mt-1">{health.gmail_error || health.approval_policy || "Every send requires owner confirmation."}</p>
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

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">{children}</div>;
}
