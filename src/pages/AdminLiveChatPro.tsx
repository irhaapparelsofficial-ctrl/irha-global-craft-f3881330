import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Eye,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  XCircle,
  Zap,
} from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type ChatSession = {
  session_id: string;
  status: "waiting" | "active" | "closed";
  visitor_name: string | null;
  visitor_company: string | null;
  visitor_email: string | null;
  visitor_whatsapp: string | null;
  visitor_requirement: string | null;
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
  visitor_typing_preview: string | null;
  visitor_typing_at: string | null;
  admin_typing_at: string | null;
  admin_seen_at: string | null;
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

type StatusFilter = "open" | "all" | ChatSession["status"];
type MobileView = "list" | "conversation";

const db = supabase as any;
const TYPING_FRESH_MS = 8_000;
const ADMIN_TYPING_HEARTBEAT_MS = 900;
const ADMIN_TYPING_IDLE_MS = 2_500;
const QUICK_REPLIES = [
  "Hello! Thank you for contacting Irha Apparels. How may I help you?",
  "Please share the product, required quantity and target market.",
  "I am online now. You can send your design or tech pack here.",
  "We are an experienced manufacturer; our website is newly built. We can also show our factory on a live video call.",
];

function statusStyle(status: ChatSession["status"]) {
  if (status === "active") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
  if (status === "closed") return "border-white/10 bg-white/5 text-white/40";
  return "border-amber-500/35 bg-amber-500/10 text-amber-200";
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function timeAgo(value: string | null) {
  if (!value) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 45) return "Now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function countryFlag(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

function locationLabel(session: ChatSession) {
  const place = Array.from(new Set([
    session.visitor_city,
    session.visitor_region,
    session.visitor_country || session.visitor_country_code,
  ].filter((value): value is string => Boolean(value))));
  return place.length === 0 ? "Location unavailable" : place.join(", ");
}

function hasUnread(session: ChatSession) {
  if (!session.last_user_message_at) return session.status === "waiting";
  if (!session.admin_seen_at) return true;
  return new Date(session.last_user_message_at).getTime() > new Date(session.admin_seen_at).getTime();
}

function whatsappHref(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D+/g, "");
  return digits.length >= 6 ? `https://wa.me/${digits}` : null;
}

function isFresh(value: string | null) {
  return Boolean(value && Date.now() - new Date(value).getTime() <= TYPING_FRESH_MS);
}

function isVisitorTyping(session: ChatSession) {
  return Boolean(session.status !== "closed" && session.visitor_typing_preview?.trim() && isFresh(session.visitor_typing_at));
}

function safePublicPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/auth")) return "/";
  return path;
}

export default function AdminLiveChatPro() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const initialRequestedSession = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("session");
  const requestedSessionRef = useRef(initialRequestedSession);
  const conversationRef = useRef<HTMLDivElement>(null);
  const adminTypingThrottleRef = useRef<number | null>(null);
  const adminTypingIdleRef = useRef<number | null>(null);
  const adminTypingSessionRef = useRef<string | null>(null);
  const lastAdminTypingSentRef = useRef(0);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialRequestedSession);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>(initialRequestedSession ? "conversation" : "list");
  const [, setClock] = useState(0);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const { data: sessionRows, error: sessionError } = await db
        .from("chat_sessions")
        .select("session_id,status,visitor_name,visitor_company,visitor_email,visitor_whatsapp,visitor_requirement,visitor_country_code,visitor_country,visitor_region,visitor_city,visitor_timezone,visitor_language,entry_path,referrer_host,first_seen_at,last_seen_at,presence_alerted_at,assigned_to,human_requested_at,last_message_at,last_user_message_at,last_admin_message_at,visitor_typing_preview,visitor_typing_at,admin_typing_at,admin_seen_at,closed_at,created_at,updated_at")
        .order("last_message_at", { ascending: false })
        .limit(200);
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
          .limit(4_000);
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
    const realtime = supabase
      .channel("admin-live-chat-console")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, (payload) => {
        const next = payload.new as ChatSession;
        if (!next?.session_id) return void load(true);
        setSessions((current) => current.some((session) => session.session_id === next.session_id)
          ? current.map((session) => session.session_id === next.session_id ? next : session)
          : [next, ...current]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => void load(true))
      .subscribe();
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 15_000);
    const clockInterval = window.setInterval(() => setClock((current) => current + 1), 1_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(realtime);
    };
  }, [isAdmin, load, user]);

  const selectedSession = useMemo(() => sessions.find((session) => session.session_id === selectedId) ?? null, [selectedId, sessions]);
  const selectedMessages = useMemo(() => messages.filter((message) => message.session_id === selectedId), [messages, selectedId]);
  const selectedVisitorTyping = Boolean(selectedSession && isVisitorTyping(selectedSession));

  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions
      .filter((session) => {
        if (statusFilter === "open" && session.status === "closed") return false;
        if (statusFilter !== "open" && statusFilter !== "all" && session.status !== statusFilter) return false;
        if (!needle) return true;
        return [session.visitor_name, session.visitor_company, session.visitor_email, session.visitor_whatsapp, session.visitor_requirement, session.visitor_country, session.visitor_country_code, session.visitor_region, session.visitor_city, session.entry_path, session.referrer_host, session.session_id].filter(Boolean).join(" ").toLowerCase().includes(needle);
      })
      .sort((left, right) => {
        const leftPriority = (isVisitorTyping(left) ? 6 : 0) + (left.status === "waiting" ? 4 : left.status === "active" ? 2 : 0) + (hasUnread(left) ? 3 : 0);
        const rightPriority = (isVisitorTyping(right) ? 6 : 0) + (right.status === "waiting" ? 4 : right.status === "active" ? 2 : 0) + (hasUnread(right) ? 3 : 0);
        if (leftPriority !== rightPriority) return rightPriority - leftPriority;
        return new Date(right.last_message_at).getTime() - new Date(left.last_message_at).getTime();
      });
  }, [query, sessions, statusFilter]);

  const waitingCount = sessions.filter((session) => session.status === "waiting").length;
  const activeCount = sessions.filter((session) => session.status === "active").length;
  const unreadCount = sessions.filter(hasUnread).length;
  const typingCount = sessions.filter(isVisitorTyping).length;

  useEffect(() => {
    if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [selectedMessages, selectedVisitorTyping]);

  const markConversationSeen = useCallback(async (sessionId: string) => {
    const now = new Date().toISOString();
    await db.from("chat_sessions").update({ admin_seen_at: now, updated_at: now }).eq("session_id", sessionId);
    setSessions((current) => current.map((session) => session.session_id === sessionId ? { ...session, admin_seen_at: now } : session));
  }, []);

  const setAdminTyping = useCallback(async (sessionId: string, active: boolean) => {
    const now = new Date().toISOString();
    await db.from("chat_sessions").update({ admin_typing_at: active ? now : null, updated_at: now }).eq("session_id", sessionId);
  }, []);

  const clearAdminTyping = useCallback((sessionId?: string | null) => {
    const target = sessionId || adminTypingSessionRef.current;
    if (adminTypingThrottleRef.current) window.clearTimeout(adminTypingThrottleRef.current);
    if (adminTypingIdleRef.current) window.clearTimeout(adminTypingIdleRef.current);
    adminTypingThrottleRef.current = null;
    adminTypingIdleRef.current = null;
    adminTypingSessionRef.current = null;
    if (target) void setAdminTyping(target, false);
  }, [setAdminTyping]);

  const signalAdminTyping = useCallback((sessionId: string, value: string) => {
    if (!value.trim()) return clearAdminTyping(sessionId);
    if (adminTypingSessionRef.current && adminTypingSessionRef.current !== sessionId) clearAdminTyping(adminTypingSessionRef.current);
    adminTypingSessionRef.current = sessionId;
    if (adminTypingIdleRef.current) window.clearTimeout(adminTypingIdleRef.current);

    const send = () => {
      lastAdminTypingSentRef.current = Date.now();
      adminTypingThrottleRef.current = null;
      void setAdminTyping(sessionId, true);
    };
    const elapsed = Date.now() - lastAdminTypingSentRef.current;
    if (elapsed >= ADMIN_TYPING_HEARTBEAT_MS) send();
    else if (!adminTypingThrottleRef.current) adminTypingThrottleRef.current = window.setTimeout(send, ADMIN_TYPING_HEARTBEAT_MS - elapsed);

    adminTypingIdleRef.current = window.setTimeout(() => clearAdminTyping(sessionId), ADMIN_TYPING_IDLE_MS);
  }, [clearAdminTyping, setAdminTyping]);

  useEffect(() => () => clearAdminTyping(), [clearAdminTyping]);

  const selectConversation = useCallback((sessionId: string) => {
    if (adminTypingSessionRef.current && adminTypingSessionRef.current !== sessionId) clearAdminTyping(adminTypingSessionRef.current);
    setSelectedId(sessionId);
    setReply("");
    setMobileView("conversation");
    void markConversationSeen(sessionId);
  }, [clearAdminTyping, markConversationSeen]);

  useEffect(() => {
    if (initialRequestedSession && selectedId === initialRequestedSession) void markConversationSeen(initialRequestedSession);
  }, [initialRequestedSession, markConversationSeen, selectedId]);

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    const message = reply.trim();
    if (!message || !selectedSession || !user || sending) return;
    setSending(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { data: inserted, error: insertError } = await db.from("chat_messages").insert({
        session_id: selectedSession.session_id,
        role: "admin",
        message,
        channel: "human",
        client_message_id: `admin-${crypto.randomUUID()}`,
      }).select("id,session_id,role,message,created_at,client_message_id").single();
      if (insertError) throw insertError;
      const { error: updateError } = await db.from("chat_sessions").update({
        status: "active",
        assigned_to: user.id,
        last_message_at: now,
        last_admin_message_at: now,
        admin_typing_at: null,
        updated_at: now,
        closed_at: null,
      }).eq("session_id", selectedSession.session_id);
      if (updateError) throw updateError;
      clearAdminTyping(selectedSession.session_id);
      if (inserted) setMessages((current) => [...current, inserted as ChatMessage]);
      setReply("");
      await markConversationSeen(selectedSession.session_id);
      await load(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Reply could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const takeConversation = async () => {
    if (!selectedSession || !user || statusBusy) return;
    setStatusBusy(true);
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await db.from("chat_sessions").update({ status: "active", assigned_to: user.id, updated_at: now, closed_at: null }).eq("session_id", selectedSession.session_id);
      if (updateError) throw updateError;
      await markConversationSeen(selectedSession.session_id);
      await load(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Conversation could not be accepted.");
    } finally {
      setStatusBusy(false);
    }
  };

  const updateStatus = async (status: "waiting" | "closed") => {
    if (!selectedSession || !user || statusBusy) return;
    setStatusBusy(true);
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await db.from("chat_sessions").update({
        status,
        assigned_to: status === "closed" ? selectedSession.assigned_to : user.id,
        closed_at: status === "closed" ? now : null,
        human_requested_at: status === "waiting" ? now : selectedSession.human_requested_at,
        admin_typing_at: null,
        visitor_typing_preview: status === "closed" ? null : selectedSession.visitor_typing_preview,
        visitor_typing_at: status === "closed" ? null : selectedSession.visitor_typing_at,
        updated_at: now,
      }).eq("session_id", selectedSession.session_id);
      if (updateError) throw updateError;
      clearAdminTyping(selectedSession.session_id);
      await load(true);
      if (status === "closed") setMobileView("list");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Conversation status could not update.");
    } finally {
      setStatusBusy(false);
    }
  };

  if (authLoading) return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground"><Loader2 className="animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground"><div className="max-w-md rounded-2xl border border-destructive/40 bg-card p-8 text-center"><XCircle className="mx-auto text-destructive" /><h1 className="mt-4 font-display text-2xl">Admin access required</h1><a href="/admin" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-border/60 px-4 text-xs uppercase tracking-[0.16em]">Back to admin</a></div></div>;

  return (
    <div className="min-h-screen bg-[#070b11] pb-[env(safe-area-inset-bottom)] text-white">
      <SEO title="Live Chat — Irha Admin" description="Private human website live chat console." path="/admin/live-chat" noindex />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b11]/96 px-3 py-2.5 backdrop-blur-xl sm:px-5"><div className="mx-auto flex max-w-[1600px] items-center gap-2.5"><a href="/admin" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:border-gold/60 hover:text-gold" aria-label="Back to admin"><ArrowLeft size={18} /></a><div className="min-w-0 flex-1"><p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-gold">Owner inbox</p><h1 className="truncate font-display text-lg">Live Chat</h1></div><div className="hidden items-center gap-1.5 text-[9px] uppercase tracking-[0.11em] sm:flex"><span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-amber-200">Waiting {waitingCount}</span><span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-emerald-300">Active {activeCount}</span>{typingCount > 0 && <span className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-2 py-1.5 text-sky-300">Typing {typingCount}</span>}</div><a href="/admin/visitors" className="hidden h-11 items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-300 sm:inline-flex">Visitors</a><button type="button" onClick={() => void load(false)} disabled={refreshing} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:border-gold/60 hover:text-gold disabled:opacity-50" aria-label="Refresh chats"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /></button></div></header>

      <main className="mx-auto max-w-[1600px] p-0 lg:p-4">
        {error && <div role="alert" className="m-3 flex items-start justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 lg:mx-0 lg:mt-0"><span className="break-words">{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><XCircle size={17} /></button></div>}
        <div className="grid min-h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom))] overflow-hidden lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-[390px_minmax(0,1fr)] lg:gap-3">
          <aside className={`${mobileView === "conversation" ? "hidden lg:flex" : "flex"} min-h-0 flex-col bg-[#0b111a] lg:rounded-2xl lg:border lg:border-white/10`}>
            <div className="space-y-2.5 border-b border-white/10 p-3"><div className="grid grid-cols-4 gap-2"><div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-2.5 py-2"><p className="text-[7px] uppercase tracking-[0.1em] text-amber-200/70">Waiting</p><p className="mt-0.5 font-display text-xl text-amber-200">{waitingCount}</p></div><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-2"><p className="text-[7px] uppercase tracking-[0.1em] text-emerald-300/70">Active</p><p className="mt-0.5 font-display text-xl text-emerald-300">{activeCount}</p></div><div className="rounded-xl border border-red-500/20 bg-red-500/8 px-2.5 py-2"><p className="text-[7px] uppercase tracking-[0.1em] text-red-200/70">Unread</p><p className="mt-0.5 font-display text-xl text-red-200">{unreadCount}</p></div><div className="rounded-xl border border-sky-400/20 bg-sky-400/8 px-2.5 py-2"><p className="text-[7px] uppercase tracking-[0.1em] text-sky-200/70">Typing</p><p className="mt-0.5 font-display text-xl text-sky-200">{typingCount}</p></div></div><label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buyer, company or country" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-3 text-sm outline-none placeholder:text-white/30 focus:border-gold/60" /></label><div className="flex gap-1.5 overflow-x-auto pb-0.5">{(["open", "waiting", "active", "closed", "all"] as const).map((filter) => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`min-h-9 shrink-0 rounded-lg border px-3 text-[8px] font-semibold uppercase tracking-[0.1em] ${statusFilter === filter ? "border-gold bg-gold text-[#07111f]" : "border-white/10 text-white/45 hover:border-gold/40 hover:text-gold"}`}>{filter}</button>)}</div></div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">{loading ? <div className="grid min-h-52 place-items-center text-white/40"><Loader2 className="animate-spin" /></div> : filteredSessions.length === 0 ? <div className="p-10 text-center text-sm text-white/40"><MessageSquare className="mx-auto mb-3 opacity-60" />No conversations in this view.</div> : filteredSessions.map((session) => { const sessionMessages = messages.filter((message) => message.session_id === session.session_id); const last = sessionMessages[sessionMessages.length - 1]; const selected = selectedId === session.session_id; const unread = hasUnread(session); const typing = isVisitorTyping(session); return <button key={session.session_id} type="button" onClick={() => selectConversation(session.session_id)} className={`w-full border-b border-white/8 p-3.5 text-left transition-colors ${selected ? "bg-gold/8 lg:border-l-2 lg:border-l-gold" : "hover:bg-white/[0.035] lg:border-l-2 lg:border-l-transparent"}`}><div className="flex items-start gap-3"><span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-xl">{countryFlag(session.visitor_country_code)}{session.status !== "closed" && <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b111a] ${typing ? "animate-pulse bg-sky-400" : session.status === "waiting" ? "bg-amber-400" : "bg-emerald-400"}`} />}</span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{session.visitor_name || "Website visitor"}</span><span className="mt-0.5 block truncate text-[10px] text-white/40">{session.visitor_company || locationLabel(session)}</span></span><span className="flex shrink-0 items-center gap-1.5">{typing && <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-sky-300">Typing</span>}{unread && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-white">New</span>}<span className="text-[9px] text-white/35">{timeAgo(session.last_message_at)}</span></span></span><span className={`mt-2 block truncate text-xs ${typing ? "font-medium text-sky-200" : unread ? "font-medium text-white/85" : "text-white/50"}`}>{typing ? `Typing now: ${session.visitor_typing_preview}` : last ? `${last.role === "admin" ? "You" : "Visitor"}: ${last.message}` : "Opened Live Chat · no message yet"}</span><span className="mt-2 flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1 truncate text-[9px] text-gold/80"><MapPin size={10} className="shrink-0" /> {locationLabel(session)}</span><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.09em] ${statusStyle(session.status)}`}>{session.status}</span></span></span></div></button>; })}</div>
          </aside>

          <section className={`${mobileView === "list" ? "hidden lg:flex" : "flex"} min-h-0 min-w-0 flex-col bg-[#0b111a] lg:rounded-2xl lg:border lg:border-white/10`}>
            {!selectedSession ? <div className="grid flex-1 place-items-center p-8 text-center text-white/40"><div><MessageSquare className="mx-auto mb-3" size={30} /><p>Select a conversation to read and reply.</p></div></div> : <><div className="border-b border-white/10 bg-[#0d141f] p-3 sm:p-4"><div className="flex items-start gap-2.5"><button type="button" onClick={() => setMobileView("list")} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 lg:hidden" aria-label="Back to conversations"><ChevronLeft size={19} /></button><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-xl">{countryFlag(selectedSession.visitor_country_code)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-display text-lg">{selectedSession.visitor_name || "Website visitor"}</h2><span className={`rounded-full border px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.1em] ${statusStyle(selectedSession.status)}`}>{selectedSession.status}</span>{selectedVisitorTyping && <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[8px] font-semibold text-sky-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />typing now</span>}</div><p className="mt-0.5 truncate text-[10px] text-white/45">{selectedSession.visitor_company || "Company not supplied"} · {locationLabel(selectedSession)}</p></div><div className="flex shrink-0 items-center gap-1.5">{selectedSession.status === "waiting" && <button type="button" onClick={() => void takeConversation()} disabled={statusBusy} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-3 text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-300 disabled:opacity-50"><Zap size={13} /> Take</button>}{selectedSession.status === "closed" ? <button type="button" onClick={() => void updateStatus("waiting")} disabled={statusBusy} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-500/35 px-3 text-[8px] font-semibold uppercase tracking-[0.1em] text-amber-200 disabled:opacity-50"><RotateCcw size={13} /> Reopen</button> : <button type="button" onClick={() => void updateStatus("closed")} disabled={statusBusy} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/45 hover:border-red-400/40 hover:text-red-300 disabled:opacity-50" aria-label="Close conversation"><CheckCircle2 size={16} /></button>}</div></div><details className="mt-3 rounded-xl border border-white/8 bg-black/15 px-3 py-2" open><summary className="cursor-pointer text-[8px] font-semibold uppercase tracking-[0.12em] text-white/45">Buyer and visit details</summary><div className="mt-2 grid gap-1.5 text-[10px] text-white/50 sm:grid-cols-2"><p><span className="text-white/30">Email:</span> {selectedSession.visitor_email ? <a href={`mailto:${selectedSession.visitor_email}`} className="text-gold hover:underline">{selectedSession.visitor_email}</a> : "Not supplied"}</p><p><span className="text-white/30">WhatsApp:</span> {(() => { const href = whatsappHref(selectedSession.visitor_whatsapp); return selectedSession.visitor_whatsapp ? (href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{selectedSession.visitor_whatsapp}</a> : <span className="text-white/60">{selectedSession.visitor_whatsapp}</span>) : "Not supplied"; })()}</p><p className="sm:col-span-2"><span className="text-white/30">Requirement:</span> <span className="text-white/70 whitespace-pre-wrap break-words">{selectedSession.visitor_requirement || "Not supplied"}</span></p><p><span className="text-white/30">Timezone:</span> {selectedSession.visitor_timezone || "Unavailable"}</p><p><span className="text-white/30">Entry page:</span> <a href={safePublicPath(selectedSession.entry_path)} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{selectedSession.entry_path || "/"}</a></p><p><span className="text-white/30">Source:</span> {selectedSession.referrer_host || "Direct visit"}</p><p><span className="text-white/30">Opened:</span> {fmt(selectedSession.first_seen_at)}</p><p><span className="text-white/30">Language:</span> {selectedSession.visitor_language || "Unavailable"}</p></div></details></div>

            <div ref={conversationRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.045),transparent_38%)] p-3 sm:p-5" role="log" aria-live="polite">{selectedMessages.length === 0 && !selectedVisitorTyping ? <div className="grid min-h-64 place-items-center text-center"><div className="max-w-xs text-white/40"><MessageSquare className="mx-auto mb-3" size={28} /><p className="text-sm">The visitor opened Live Chat but has not sent a message yet.</p><p className="mt-2 text-xs">Send a greeting to start the conversation.</p></div></div> : selectedMessages.map((message) => <div key={message.id} className={`flex ${message.role === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${message.role === "admin" ? "rounded-br-md bg-gold text-[#07111f]" : "rounded-bl-md border border-white/10 bg-[#121b28] text-white"}`}><p>{message.message}</p><p className={`mt-1.5 text-[8px] ${message.role === "admin" ? "text-[#07111f]/55" : "text-white/35"}`}>{message.role === "admin" ? "Irha Apparels" : selectedSession.visitor_name || "Visitor"} · {fmt(message.created_at)}</p></div></div>)}{selectedVisitorTyping && <div className="flex justify-start"><div className="max-w-[90%] rounded-2xl rounded-bl-md border border-sky-400/30 bg-sky-400/[0.08] px-3.5 py-3 shadow-lg shadow-sky-950/10"><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-300"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-300" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-300 [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-300 [animation-delay:240ms]" /></span>Customer is typing · live preview</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white">{selectedSession.visitor_typing_preview}</p><p className="mt-2 inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.1em] text-sky-200/55"><Eye size={10} /> Not sent yet · clears automatically</p></div></div>}</div>

            <form onSubmit={sendReply} className="border-t border-white/10 bg-[#0d141f] p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:p-4">{selectedSession.status === "closed" ? <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/45"><span>This conversation is closed.</span><button type="button" onClick={() => void updateStatus("waiting")} className="text-gold hover:underline">Reopen to reply</button></div> : <><div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">{QUICK_REPLIES.map((quickReply, index) => <button key={quickReply} type="button" onClick={() => { setReply(quickReply); signalAdminTyping(selectedSession.session_id, quickReply); }} className="min-h-8 shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 text-[8px] font-medium text-white/55 hover:border-gold/40 hover:text-gold">Quick reply {index + 1}</button>)}</div><div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-gold/55"><textarea value={reply} onChange={(event) => { setReply(event.target.value); signalAdminTyping(selectedSession.session_id, event.target.value); }} onBlur={() => window.setTimeout(() => { if (document.activeElement?.tagName !== "TEXTAREA") clearAdminTyping(selectedSession.session_id); }, 200)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} maxLength={2_000} placeholder="Type your reply…" aria-label="Admin live chat reply" disabled={sending} className="max-h-32 min-h-10 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-white/25 disabled:opacity-60" /><button type="submit" disabled={sending || !reply.trim()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-[#07111f] disabled:opacity-35" aria-label="Send admin reply">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button></div><p className="mt-2 text-[9px] text-white/35">Buyer sees “Irha team is typing…” while you type. Your unsent admin draft is never shown.</p></>}</form>
            </>}
          </section>
        </div>
        <div className="hidden"><span className="inline-flex items-center gap-1"><Clock3 size={10} /> Realtime sync active</span><a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={10} /> Website</a></div>
      </main>
    </div>
  );
}
