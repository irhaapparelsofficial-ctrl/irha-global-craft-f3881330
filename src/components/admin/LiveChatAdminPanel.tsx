import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, MessageSquare, Phone, RefreshCw, Send, UserRound, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type SessionStatus = "pending" | "open" | "resolved" | "closed";

type LiveChatSession = {
  session_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_whatsapp: string | null;
  company_name: string | null;
  country: string | null;
  page_path: string | null;
  page_title: string | null;
  status: SessionStatus;
  priority: "normal" | "high" | "urgent";
  unread_admin: number;
  unread_visitor: number;
  last_message_at: string;
  last_user_message_at: string | null;
  last_admin_message_at: string | null;
  created_at: string;
};

type LiveChatMessage = {
  id: string;
  session_id: string;
  role: "user" | "admin";
  message: string;
  channel: string;
  client_message_id: string | null;
  created_at: string;
};

const db = supabase as any;

export default function LiveChatAdminPanel() {
  const [sessions, setSessions] = useState<LiveChatSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => sessions.find((session) => session.session_id === selectedId) ?? null,
    [selectedId, sessions],
  );

  const loadSessions = useCallback(async () => {
    const { data, error: queryError } = await db
      .from("live_chat_sessions")
      .select("session_id,visitor_name,visitor_email,visitor_whatsapp,company_name,country,page_path,page_title,status,priority,unread_admin,unread_visitor,last_message_at,last_user_message_at,last_admin_message_at,created_at")
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const next = (data ?? []) as LiveChatSession[];
    setSessions(next);
    setSelectedId((current) => current && next.some((item) => item.session_id === current)
      ? current
      : next[0]?.session_id ?? null);
    setError(null);
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    const { data, error: queryError } = await db
      .from("chat_messages")
      .select("id,session_id,role,message,channel,client_message_id,created_at")
      .eq("session_id", sessionId)
      .eq("channel", "human")
      .in("role", ["user", "admin"])
      .order("created_at", { ascending: true })
      .limit(200);

    if (queryError) {
      setError(queryError.message);
      return;
    }

    setMessages((data ?? []) as LiveChatMessage[]);
    await db.from("live_chat_sessions").update({ unread_admin: 0, updated_at: new Date().toISOString() }).eq("session_id", sessionId);
    setSessions((current) => current.map((item) => item.session_id === sessionId ? { ...item, unread_admin: 0 } : item));
  }, []);

  useEffect(() => {
    void loadSessions();
    const id = window.setInterval(() => void loadSessions(), 8_000);
    return () => window.clearInterval(id);
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
    const id = window.setInterval(() => void loadMessages(selectedId), 6_000);
    return () => window.clearInterval(id);
  }, [loadMessages, selectedId]);

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !draft.trim() || busy) return;
    setBusy(true);
    const outgoing = draft.trim();
    const { error: replyError } = await db.rpc("live_chat_admin_reply", {
      _session_id: selected.session_id,
      _message: outgoing,
      _client_message_id: crypto.randomUUID(),
    });
    setBusy(false);
    if (replyError) {
      toast({ title: "Reply could not be saved", description: replyError.message, variant: "destructive" });
      return;
    }
    setDraft("");
    await Promise.all([loadMessages(selected.session_id), loadSessions()]);
    toast({ title: "Reply added to live chat", description: "It will appear in the buyer's chat window." });
  };

  const setStatus = async (status: SessionStatus) => {
    if (!selected || busy) return;
    setBusy(true);
    const { error: statusError } = await db.rpc("live_chat_set_status", {
      _session_id: selected.session_id,
      _status: status,
    });
    setBusy(false);
    if (statusError) {
      toast({ title: "Status could not be updated", description: statusError.message, variant: "destructive" });
      return;
    }
    await loadSessions();
  };

  const stats = useMemo(() => ({
    total: sessions.length,
    waiting: sessions.filter((item) => item.status === "pending").length,
    unread: sessions.reduce((sum, item) => sum + item.unread_admin, 0),
    open: sessions.filter((item) => item.status === "open").length,
  }), [sessions]);

  return (
    <section className="space-y-4">
      <div className="border border-border/60 bg-card/25 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Human Live Chat</p>
          <h2 className="font-display text-2xl sm:text-3xl">Buyer support inbox</h2>
          <p className="text-sm text-foreground/55 mt-2">Private website conversations. Replies stay inside the buyer's browser chat; no external email or WhatsApp is sent automatically.</p>
        </div>
        <button type="button" onClick={() => void loadSessions()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-40">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border border-border/60 bg-border/60">
        <Metric label="Conversations" value={stats.total} />
        <Metric label="Waiting" value={stats.waiting} />
        <Metric label="Unread" value={stats.unread} />
        <Metric label="Open" value={stats.open} />
      </div>

      {error && <div className="border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}

      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] border border-border/60 min-h-[620px] bg-card/15">
        <aside className="border-b lg:border-b-0 lg:border-r border-border/60 max-h-[620px] overflow-y-auto">
          {loading && sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading conversations…</p>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 px-5">
              <MessageSquare size={28} className="mx-auto text-muted-foreground" />
              <p className="font-display text-xl mt-3">No human chats yet</p>
              <p className="text-xs text-muted-foreground mt-2">New buyer requests will appear here.</p>
            </div>
          ) : sessions.map((session) => (
            <button
              key={session.session_id}
              type="button"
              onClick={() => setSelectedId(session.session_id)}
              className={`w-full text-left p-4 border-b border-border/50 hover:bg-muted/30 ${selectedId === session.session_id ? "bg-gold/[0.06] border-l-2 border-l-gold" : "border-l-2 border-l-transparent"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{session.visitor_name || "Website visitor"}</p>
                  <p className="text-xs text-foreground/50 truncate mt-1">{session.company_name || session.visitor_email || session.visitor_whatsapp || session.session_id.slice(0, 8)}</p>
                </div>
                {session.unread_admin > 0 && <span className="min-w-6 h-6 px-1 rounded-full bg-red-500 text-white text-[10px] inline-flex items-center justify-center">{session.unread_admin}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.13em]">
                <Status value={session.status} />
                <span className="text-muted-foreground normal-case tracking-normal">{new Date(session.last_message_at).toLocaleString()}</span>
              </div>
            </button>
          ))}
        </aside>

        <div className="min-w-0 flex flex-col max-h-[760px]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">Select a conversation.</div>
          ) : (
            <>
              <header className="border-b border-border/60 p-4 sm:p-5">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <UserRound size={17} className="text-gold" />
                      <h3 className="font-display text-xl sm:text-2xl truncate">{selected.visitor_name || "Website visitor"}</h3>
                      <Status value={selected.status} />
                    </div>
                    <p className="text-xs text-foreground/50 mt-2 break-words">{selected.company_name || "No company provided"}{selected.country ? ` · ${selected.country}` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {selected.visitor_email && <a href={`mailto:${selected.visitor_email}`} className="min-h-9 inline-flex items-center gap-2 border border-border/60 px-3 hover:border-gold"><Mail size={12} />{selected.visitor_email}</a>}
                      {selected.visitor_whatsapp && <a href={`https://wa.me/${selected.visitor_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="min-h-9 inline-flex items-center gap-2 border border-border/60 px-3 hover:border-gold"><Phone size={12} />{selected.visitor_whatsapp}</a>}
                    </div>
                    {selected.page_path && <a href={selected.page_path} target="_blank" rel="noreferrer noopener" className="block text-[10px] text-gold mt-3 break-all hover:underline">Started from {selected.page_title || selected.page_path} · {selected.page_path}</a>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void setStatus("open")} disabled={busy || selected.status === "open"} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] disabled:opacity-35"><MessageSquare size={12} /> Open</button>
                    <button type="button" onClick={() => void setStatus("resolved")} disabled={busy || selected.status === "resolved"} className="min-h-10 inline-flex items-center gap-2 border border-emerald-500/40 text-emerald-300 px-3 text-[9px] uppercase tracking-[0.14em] disabled:opacity-35"><CheckCircle2 size={12} /> Resolve</button>
                    <button type="button" onClick={() => void setStatus("closed")} disabled={busy || selected.status === "closed"} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] disabled:opacity-35"><XCircle size={12} /> Close</button>
                  </div>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-background/30">
                {messages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">No messages in this conversation.</p> : messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${message.role === "admin" ? "bg-gold text-background" : "bg-card border border-border/60"}`}>
                      <p>{message.message}</p>
                      <p className="text-[8px] opacity-55 mt-1">{message.role === "admin" ? "Irha team" : selected.visitor_name || "Buyer"} · {new Date(message.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="border-t border-border/60 p-3 sm:p-4 bg-card">
                <div className="flex items-end gap-2">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={2000} className="min-h-12 min-w-0 flex-1 resize-none bg-background border border-border/60 focus:border-gold outline-none px-3 py-2.5 text-sm max-h-28" placeholder="Write an Irha team reply…" />
                  <button type="submit" disabled={busy || !draft.trim()} className="min-h-12 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40"><Send size={13} /> Reply</button>
                </div>
                <p className="text-[9px] text-foreground/40 mt-2">This reply appears in the buyer's website chat. It does not send an email or WhatsApp message.</p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="bg-card p-4"><p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="font-display text-3xl mt-1">{value}</p></div>;
}

function Status({ value }: { value: SessionStatus }) {
  const classes = value === "pending" ? "border-amber-500/45 text-amber-300" : value === "open" ? "border-gold/45 text-gold" : value === "resolved" ? "border-emerald-500/45 text-emerald-300" : "border-border/60 text-muted-foreground";
  return <span className={`inline-flex border px-2 py-1 text-[8px] uppercase tracking-[0.13em] ${classes}`}>{value}</span>;
}
