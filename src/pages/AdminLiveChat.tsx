import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, MapPin, MessageSquare, RefreshCw, RotateCcw, Send, UserRound, XCircle } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type ChatSession = {
  session_id: string;
  status: "waiting" | "active" | "closed";
  visitor_name: string | null;
  visitor_company: string | null;
  visitor_email: string | null;
  visitor_country_code: string | null;
  visitor_country: string | null;
  visitor_region: string | null;
  visitor_city: string | null;
  visitor_timezone: string | null;
  visitor_language: string | null;
  entry_path: string | null;
  referrer_host: string | null;
  first_seen_at: string;
  last_seen_at: string;
  presence_alerted_at: string | null;
  assigned_to: string | null;
  human_requested_at: string;
  last_message_at: string;
  last_user_message_at: string | null;
  last_admin_message_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  session_id: string;
  role: "user" | "admin";
  message: string;
  created_at: string;
  client_message_id?: string | null;
};

const db = supabase as any;

function statusStyle(status: ChatSession["status"]) {
  if (status === "active") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
  if (status === "closed") return "border-border/60 bg-muted/30 text-muted-foreground";
  return "border-amber-500/35 bg-amber-500/10 text-amber-200";
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function countryFlag(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

function locationLabel(session: ChatSession) {
  const place = Array.from(new Set([
    session.visitor_city,
    session.visitor_region,
    session.visitor_country || session.visitor_country_code,
  ].filter((value): value is string => Boolean(value))));
  const flag = countryFlag(session.visitor_country_code);
  if (place.length === 0) return "Location unavailable";
  return `${flag ? `${flag} ` : ""}${place.join(", ")}`;
}

export default function AdminLiveChat() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const requestedSessionRef = useRef(
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("session"),
  );
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | ChatSession["status"]>("open");
  const conversationRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const { data: sessionRows, error: sessionError } = await db
        .from("chat_sessions")
        .select("session_id,status,visitor_name,visitor_company,visitor_email,visitor_country_code,visitor_country,visitor_region,visitor_city,visitor_timezone,visitor_language,entry_path,referrer_host,first_seen_at,last_seen_at,presence_alerted_at,assigned_to,human_requested_at,last_message_at,last_user_message_at,last_admin_message_at,closed_at,created_at,updated_at")
        .order("last_seen_at", { ascending: false })
        .limit(150);
      if (sessionError) throw sessionError;

      const normalizedSessions = (sessionRows ?? []) as ChatSession[];
      const ids = normalizedSessions.map((session) => session.session_id);
      let messageRows: ChatMessage[] = [];
      if (ids.length > 0) {
        const { data, error: messageError } = await db
          .from("chat_messages")
          .select("id,session_id,role,message,created_at,client_message_id")
          .eq("channel", "human")
          .in("session_id", ids)
          .order("created_at", { ascending: true })
          .limit(3_000);
        if (messageError) throw messageError;
        messageRows = (data ?? []) as ChatMessage[];
      }

      setSessions(normalizedSessions);
      setMessages(messageRows);
      setSelectedId((current) => {
        if (current && normalizedSessions.some((session) => session.session_id === current)) return current;
        const requested = requestedSessionRef.current;
        if (requested && normalizedSessions.some((session) => session.session_id === requested)) {
          requestedSessionRef.current = null;
          return requested;
        }
        return normalizedSessions.find((session) => session.status === "waiting")?.session_id ?? normalizedSessions[0]?.session_id ?? null;
      });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Live chats could not load.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    void load(false);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 3_000);
    return () => window.clearInterval(interval);
  }, [isAdmin, load, user]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.session_id === selectedId) ?? null,
    [selectedId, sessions],
  );

  const selectedMessages = useMemo(
    () => messages.filter((message) => message.session_id === selectedId),
    [messages, selectedId],
  );

  const filteredSessions = useMemo(() => sessions.filter((session) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return session.status !== "closed";
    return session.status === statusFilter;
  }), [sessions, statusFilter]);

  const waitingCount = sessions.filter((session) => session.status === "waiting").length;
  const activeCount = sessions.filter((session) => session.status === "active").length;

  useEffect(() => {
    if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [selectedMessages]);

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    const message = reply.trim();
    if (!message || !selectedSession || !user || sending) return;
    setSending(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { error: insertError } = await db.from("chat_messages").insert({
        session_id: selectedSession.session_id,
        role: "admin",
        message,
        channel: "human",
        client_message_id: `admin-${crypto.randomUUID()}`,
      });
      if (insertError) throw insertError;

      const { error: updateError } = await db.from("chat_sessions").update({
        status: "active",
        assigned_to: user.id,
        last_message_at: now,
        last_admin_message_at: now,
        updated_at: now,
        closed_at: null,
      }).eq("session_id", selectedSession.session_id);
      if (updateError) throw updateError;
      setReply("");
      await load(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Reply could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: "waiting" | "closed") => {
    if (!selectedSession || !user) return;
    setError(null);
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await db.from("chat_sessions").update({
        status,
        assigned_to: status === "closed" ? selectedSession.assigned_to : user.id,
        closed_at: status === "closed" ? now : null,
        human_requested_at: status === "waiting" ? now : selectedSession.human_requested_at,
        updated_at: now,
      }).eq("session_id", selectedSession.session_id);
      if (updateError) throw updateError;
      await load(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Conversation status could not update.");
    }
  };

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground"><Loader2 className="animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6 text-foreground">
        <div className="max-w-md border border-destructive/40 bg-card p-8 text-center">
          <XCircle className="mx-auto text-destructive" />
          <h1 className="mt-4 font-display text-2xl">Admin access required</h1>
          <a href="/admin" className="mt-6 inline-flex min-h-11 items-center border border-border/60 px-4 text-xs uppercase tracking-[0.16em]">Back to admin</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Live Chat — Irha Admin" description="Private human website live chat console." path="/admin/live-chat" noindex />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <a href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border/60 text-muted-foreground hover:border-gold hover:text-gold" aria-label="Back to admin"><ArrowLeft size={18} /></a>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Irha Admin</p>
            <h1 className="truncate font-display text-lg sm:text-xl">Human Live Chat</h1>
          </div>
          <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.14em] sm:flex">
            <span className="border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-amber-200">Waiting {waitingCount}</span>
            <span className="border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-300">Active {activeCount}</span>
          </div>
          <button type="button" onClick={() => void load(false)} disabled={refreshing} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border/60 text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-50" aria-label="Refresh chats"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /></button>
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden min-h-11 items-center gap-2 border border-gold/60 px-3 text-[10px] uppercase tracking-[0.14em] text-gold sm:inline-flex"><ExternalLink size={13} /> Website</a>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-3 sm:p-5">
        {error && (
          <div role="alert" className="mb-3 flex items-start justify-between gap-3 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="break-words">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><XCircle size={17} /></button>
          </div>
        )}

        <div className="grid min-h-[calc(100dvh-7.5rem)] gap-3 lg:grid-cols-[370px_minmax(0,1fr)]">
          <aside className="flex min-h-[420px] flex-col overflow-hidden border border-border/60 bg-card/35">
            <div className="border-b border-border/60 p-3">
              <div className="grid grid-cols-5 gap-1">
                {(["open", "waiting", "active", "closed", "all"] as const).map((filter) => (
                  <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`min-h-10 px-1 text-[9px] uppercase tracking-[0.1em] ${statusFilter === filter ? "bg-gold text-background" : "border border-border/60 text-muted-foreground hover:text-foreground"}`}>{filter}</button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="grid min-h-52 place-items-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <MessageSquare className="mx-auto mb-3 opacity-60" />
                  No conversations in this view.
                </div>
              ) : filteredSessions.map((session) => {
                const sessionMessages = messages.filter((message) => message.session_id === session.session_id);
                const last = sessionMessages[sessionMessages.length - 1];
                const selected = selectedId === session.session_id;
                return (
                  <button key={session.session_id} type="button" onClick={() => setSelectedId(session.session_id)} className={`w-full border-b border-border/40 p-3 text-left transition-colors ${selected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/35 border-l-2 border-l-transparent"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{session.visitor_name || "Website visitor"}</p>
                        <p className="truncate text-xs text-muted-foreground">{session.visitor_company || `Session ${session.session_id.slice(-8)}`}</p>
                      </div>
                      <span className={`shrink-0 border px-2 py-1 text-[8px] uppercase tracking-[0.12em] ${statusStyle(session.status)}`}>{session.status}</span>
                    </div>
                    <p className="mt-2 flex items-center gap-1 truncate text-[10px] text-gold/90"><MapPin size={11} className="shrink-0" /> {locationLabel(session)}</p>
                    <p className="mt-1 truncate text-xs text-foreground/65">{last ? `${last.role === "admin" ? "You" : "Visitor"}: ${last.message}` : "Visitor opened Live Chat · no message yet"}</p>
                    <p className="mt-1 text-[9px] text-muted-foreground">Seen {fmt(session.last_seen_at)}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-[560px] min-w-0 flex-col overflow-hidden border border-border/60 bg-card/20">
            {!selectedSession ? (
              <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
                <div><MessageSquare className="mx-auto mb-3" size={30} /><p>Select a conversation to read and reply.</p></div>
              </div>
            ) : (
              <>
                <div className="border-b border-border/60 bg-card/60 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <UserRound size={17} className="text-gold" />
                        <h2 className="font-display text-lg">{selectedSession.visitor_name || "Website visitor"}</h2>
                        <span className={`border px-2 py-1 text-[8px] uppercase tracking-[0.12em] ${statusStyle(selectedSession.status)}`}>{selectedSession.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedSession.visitor_company || "Company not supplied"}
                        {selectedSession.visitor_email ? <> · <a href={`mailto:${selectedSession.visitor_email}`} className="text-gold hover:underline">{selectedSession.visitor_email}</a></> : null}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gold"><MapPin size={13} /> {locationLabel(selectedSession)}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        First seen {fmt(selectedSession.first_seen_at)}
                        {selectedSession.visitor_timezone ? ` · ${selectedSession.visitor_timezone}` : ""}
                        {selectedSession.entry_path ? <> · Page <a href={selectedSession.entry_path} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{selectedSession.entry_path}</a></> : null}
                      </p>
                      <p className="mt-1 break-all text-[9px] text-muted-foreground/70">Session {selectedSession.session_id} · requested {fmt(selectedSession.human_requested_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedSession.status === "closed" ? (
                        <button type="button" onClick={() => void updateStatus("waiting")} className="inline-flex min-h-11 items-center gap-2 border border-amber-500/50 px-3 text-[10px] uppercase tracking-[0.13em] text-amber-200"><RotateCcw size={14} /> Reopen</button>
                      ) : (
                        <button type="button" onClick={() => void updateStatus("closed")} className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.13em] text-muted-foreground hover:border-destructive hover:text-destructive"><CheckCircle2 size={14} /> Close</button>
                      )}
                    </div>
                  </div>
                </div>

                <div ref={conversationRef} className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 space-y-3" role="log" aria-live="polite">
                  {selectedMessages.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">The visitor opened Live Chat but has not sent a message yet.</p>
                  ) : selectedMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] rounded-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${message.role === "admin" ? "bg-primary text-primary-foreground" : "border border-border/60 bg-card text-foreground"}`}>
                        <p>{message.message}</p>
                        <p className={`mt-1.5 text-[9px] ${message.role === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{message.role === "admin" ? "Irha Admin" : selectedSession.visitor_name || "Visitor"} · {fmt(message.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={sendReply} className="border-t border-border/60 bg-card p-3 sm:p-4">
                  {selectedSession.status === "closed" ? (
                    <div className="flex min-h-12 items-center justify-between gap-3 border border-border/60 bg-muted/20 px-4 text-sm text-muted-foreground">
                      <span>This conversation is closed.</span>
                      <button type="button" onClick={() => void updateStatus("waiting")} className="text-gold hover:underline">Reopen to reply</button>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <textarea value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={2_000} placeholder="Reply as Irha Apparels admin…" aria-label="Admin live chat reply" disabled={sending} className="min-h-12 max-h-36 min-w-0 flex-1 resize-y border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-gold disabled:opacity-60" />
                      <button type="submit" disabled={sending || !reply.trim()} className="inline-flex min-h-12 min-w-12 items-center justify-center bg-gold text-background disabled:opacity-40" aria-label="Send admin reply">{sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button>
                    </div>
                  )}
                  <p className="mt-2 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Auto-refresh every 3 seconds · replies are stored in Supabase · location is approximate edge context · no raw IP stored</p>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
