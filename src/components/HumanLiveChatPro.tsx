import { FormEvent, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Headphones, MessageCircle, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { whatsappLink } from "@/lib/constants";
import { supabasePublishableKey, supabaseRuntimeUrl } from "@/integrations/supabase/client";

type LiveMessage = {
  id: string;
  role: "user" | "admin";
  message: string;
  created_at: string;
  client_message_id?: string | null;
};

type ConversationStatus = "waiting" | "active" | "closed";

type ChatResponse = {
  ok?: boolean;
  status?: ConversationStatus;
  messages?: LiveMessage[];
  presenceRecorded?: boolean;
  error?: string;
};

type TypingResponse = {
  ok?: boolean;
  adminIsTyping?: boolean;
  adminTypingAt?: string | null;
  error?: string;
};

type VisitorContext = {
  visitorCountryCode?: string | null;
  visitorCountry?: string | null;
  visitorRegion?: string | null;
  visitorCity?: string | null;
  visitorTimezone?: string | null;
  visitorLanguage?: string | null;
};

const SESSION_KEY = "irha:human-chat-session";
const TOKEN_KEY = "irha:human-chat-token";
const STARTED_KEY = "irha:human-chat-started";
const NAME_KEY = "irha:human-chat-name";
const COMPANY_KEY = "irha:human-chat-company";
const EMAIL_KEY = "irha:human-chat-email";
const WHATSAPP_KEY = "irha:human-chat-whatsapp";
const REQUIREMENT_KEY = "irha:human-chat-requirement";
const PRESENCE_KEY_PREFIX = "irha:human-chat-presence:";
const OPEN_EVENT = "irha:open-human-chat";
const TYPING_HEARTBEAT_MS = 900;
const TYPING_IDLE_MS = 2_500;
const ADMIN_TYPING_POLL_MS = 1_200;
const WHATSAPP_ALLOWED = /^[+0-9()\-.\s]*$/;

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createCredentials() {
  return { sessionId: `human-${crypto.randomUUID()}`, visitorToken: randomToken() };
}

function readStoredCredentials() {
  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    const visitorToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionId && visitorToken) return { sessionId, visitorToken };
  } catch {
    // Storage can be blocked. A memory-only session still works.
  }
  const created = createCredentials();
  try {
    sessionStorage.setItem(SESSION_KEY, created.sessionId);
    sessionStorage.setItem(TOKEN_KEY, created.visitorToken);
  } catch {
    // Memory-only fallback.
  }
  return created;
}

function wasStarted() {
  try {
    return sessionStorage.getItem(STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

function readStored(key: string) {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // Memory-only fallback.
  }
}


function presenceStorageKey(sessionId: string) {
  return `${PRESENCE_KEY_PREFIX}${sessionId}`;
}

function presenceWasReported(sessionId: string) {
  try {
    return sessionStorage.getItem(presenceStorageKey(sessionId)) === "1";
  } catch {
    return false;
  }
}

function markPresenceReported(sessionId: string) {
  try {
    sessionStorage.setItem(presenceStorageKey(sessionId), "1");
  } catch {
    // Server-side dedupe prevents duplicate alerts.
  }
}

async function readVisitorContext(): Promise<VisitorContext> {
  const fallback: VisitorContext = {
    visitorTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    visitorLanguage: navigator.language || null,
  };
  try {
    const response = await fetch("/api/visitor-context", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return fallback;
    const context = await response.json() as Record<string, string | null>;
    return {
      visitorCountryCode: context.countryCode || null,
      visitorCountry: context.country || null,
      visitorRegion: context.region || null,
      visitorCity: context.city || null,
      visitorTimezone: context.timezone || fallback.visitorTimezone || null,
      visitorLanguage: fallback.visitorLanguage || null,
    };
  } catch {
    return fallback;
  }
}

function statusLabel(status: ConversationStatus) {
  if (status === "active") return "Irha team joined";
  if (status === "closed") return "Conversation closed";
  return "Message sent · waiting for team";
}

function isMobileInteraction() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
}

export default function HumanLiveChatPro() {
  const credentialsRef = useRef(readStoredCredentials());
  const visitorContextRef = useRef<VisitorContext>({});
  const presenceInFlightRef = useRef<Promise<void> | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingThrottleRef = useRef<number | null>(null);
  const typingIdleRef = useRef<number | null>(null);
  const latestDraftRef = useRef("");
  const lastTypingSentRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(wasStarted());
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [status, setStatus] = useState<ConversationStatus>("waiting");
  const [visitorName, setVisitorName] = useState(() => readStored(NAME_KEY));
  const [visitorCompany, setVisitorCompany] = useState(() => readStored(COMPANY_KEY));
  const [visitorEmail, setVisitorEmail] = useState(() => readStored(EMAIL_KEY));
  const [visitorWhatsApp, setVisitorWhatsApp] = useState(() => readStored(WHATSAPP_KEY));
  const [visitorRequirement, setVisitorRequirement] = useState(() => readStored(REQUIREMENT_KEY));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileViewportStyle, setMobileViewportStyle] = useState<CSSProperties>();

  const request = useCallback(async <T,>(functionName: string, payload: Record<string, unknown>) => {
    const response = await fetch(`${supabaseRuntimeUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabasePublishableKey}`,
        apikey: supabasePublishableKey,
      },
      body: JSON.stringify({ ...credentialsRef.current, ...payload }),
      keepalive: functionName === "live-chat-typing",
    });
    const body = await response.json().catch(() => ({ error: "invalid_response" })) as T & { error?: string };
    if (!response.ok) {
      const apiError = new Error(body.error || "live_chat_unavailable");
      (apiError as Error & { status?: number }).status = response.status;
      throw apiError;
    }
    return body;
  }, []);

  const callApi = useCallback((payload: Record<string, unknown>) => request<ChatResponse>("live-chat", payload), [request]);
  const callTypingApi = useCallback((payload: Record<string, unknown>) => request<TypingResponse>("live-chat-typing", payload), [request]);

  const reportPresence = useCallback(async () => {
    const sessionId = credentialsRef.current.sessionId;
    if (presenceWasReported(sessionId)) return;
    if (presenceInFlightRef.current) return presenceInFlightRef.current;
    const operation = (async () => {
      try {
        const context = await readVisitorContext();
        visitorContextRef.current = context;
        await callApi({
          action: "presence",
          ...context,
          entryPath: `${window.location.pathname}${window.location.search}`.slice(0, 500),
          referrer: document.referrer,
        });
        markPresenceReported(sessionId);
      } catch {
        // Chat remains usable when optional presence context is unavailable.
      }
    })();
    presenceInFlightRef.current = operation;
    try {
      await operation;
    } finally {
      presenceInFlightRef.current = null;
    }
  }, [callApi]);

  const sendTypingState = useCallback(async (draftPreview: string, isTyping: boolean) => {
    try {
      await reportPresence();
      await callTypingApi({ action: isTyping ? "visitor_typing" : "visitor_clear", draftPreview, isTyping });
    } catch {
      // Typing intelligence is an enhancement; message delivery remains available.
    }
  }, [callTypingApi, reportPresence]);

  const clearTyping = useCallback(() => {
    latestDraftRef.current = "";
    if (typingThrottleRef.current) window.clearTimeout(typingThrottleRef.current);
    if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
    typingThrottleRef.current = null;
    typingIdleRef.current = null;
    void sendTypingState("", false);
  }, [sendTypingState]);

  const publishTyping = useCallback((draft: string) => {
    latestDraftRef.current = draft.slice(0, 1_000);
    if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
    if (!draft.trim()) {
      clearTyping();
      return;
    }

    const send = () => {
      lastTypingSentRef.current = Date.now();
      typingThrottleRef.current = null;
      void sendTypingState(latestDraftRef.current, true);
    };
    const elapsed = Date.now() - lastTypingSentRef.current;
    if (elapsed >= TYPING_HEARTBEAT_MS) send();
    else if (!typingThrottleRef.current) typingThrottleRef.current = window.setTimeout(send, TYPING_HEARTBEAT_MS - elapsed);

    typingIdleRef.current = window.setTimeout(() => {
      void sendTypingState("", false);
      typingIdleRef.current = null;
    }, TYPING_IDLE_MS);
  }, [clearTyping, sendTypingState]);

  const poll = useCallback(async (showSpinner = false) => {
    if (!started) return;
    if (showSpinner) setPolling(true);
    try {
      const body = await callApi({ action: "poll" });
      setMessages(body.messages ?? []);
      setStatus(body.status ?? "waiting");
      setError(null);
    } catch (pollError) {
      const typed = pollError as Error & { status?: number };
      if (typed.status === 404 || typed.status === 403) {
        setStarted(false);
        try { sessionStorage.removeItem(STARTED_KEY); } catch { /* no-op */ }
      }
      setError("Live chat could not refresh. Retry in a moment or use WhatsApp for urgent contact.");
    } finally {
      if (showSpinner) setPolling(false);
    }
  }, [callApi, started]);

  const pollAdminTyping = useCallback(async () => {
    try {
      const body = await callTypingApi({ action: "poll" });
      setAdminTyping(Boolean(body.adminIsTyping));
    } catch {
      setAdminTyping(false);
    }
  }, [callTypingApi]);

  useEffect(() => {
    const openHumanChat = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, openHumanChat);
    return () => window.removeEventListener(OPEN_EVENT, openHumanChat);
  }, []);

  useEffect(() => {
    if (!open) return;
    void reportPresence();
    void pollAdminTyping();
    const typingPoll = window.setInterval(() => void pollAdminTyping(), ADMIN_TYPING_POLL_MS);
    return () => window.clearInterval(typingPoll);
  }, [open, pollAdminTyping, reportPresence]);

  useEffect(() => {
    if (!started || !open) return;
    void poll(true);
    const interval = window.setInterval(() => void poll(false), 2_500);
    return () => window.clearInterval(interval);
  }, [open, poll, started]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [adminTyping, messages, sending]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
    const mobile = isMobileInteraction();
    const previousOverflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = "hidden";
    const updateViewport = () => {
      if (!mobile || !window.visualViewport) return setMobileViewportStyle(undefined);
      const viewport = window.visualViewport;
      setMobileViewportStyle({ top: Math.max(6, viewport.offsetTop + 6), bottom: "auto", height: Math.max(300, viewport.height - 12) });
    };
    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      window.clearTimeout(timer);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      if (mobile) document.body.style.overflow = previousOverflow;
      setMobileViewportStyle(undefined);
    };
  }, [open]);

  useEffect(() => () => {
    if (typingThrottleRef.current) window.clearTimeout(typingThrottleRef.current);
    if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
    void sendTypingState("", false);
  }, [sendTypingState]);

  const close = () => {
    clearTyping();
    setAdminTyping(false);
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending || status === "closed") return;
    const trimmedName = visitorName.trim();
    const trimmedCompany = visitorCompany.trim();
    const trimmedEmail = visitorEmail.trim();
    const trimmedWhatsApp = visitorWhatsApp.trim().slice(0, 50);
    const trimmedRequirement = visitorRequirement.trim().slice(0, 500);
    if (!started && !trimmedName) {
      setError("Please add your name so the Irha team knows who is contacting them.");
      return;
    }
    if (trimmedWhatsApp && (!WHATSAPP_ALLOWED.test(trimmedWhatsApp) || !/[0-9]/.test(trimmedWhatsApp))) {
      setError("WhatsApp/phone can include only digits, spaces, + ( ) - . — or leave it empty.");
      return;
    }
    // Persist contact fields for later sessions like existing name/company/email.
    writeStored(NAME_KEY, trimmedName);
    writeStored(COMPANY_KEY, trimmedCompany);
    writeStored(EMAIL_KEY, trimmedEmail);
    writeStored(WHATSAPP_KEY, trimmedWhatsApp);
    writeStored(REQUIREMENT_KEY, trimmedRequirement);
    setSending(true);
    setError(null);
    try {
      await reportPresence();
      const body = await callApi({
        action: started ? "send" : "connect",
        message,
        clientMessageId: crypto.randomUUID(),
        visitorName: trimmedName,
        visitorCompany: trimmedCompany,
        visitorEmail: trimmedEmail,
        visitorWhatsApp: trimmedWhatsApp,
        visitorRequirement: trimmedRequirement,
        ...visitorContextRef.current,
        entryPath: `${window.location.pathname}${window.location.search}`.slice(0, 500),
        referrer: document.referrer,
      });
      setMessages(body.messages ?? []);
      setStatus(body.status ?? "waiting");
      setInput("");
      clearTyping();
      if (!started) {
        setStarted(true);
        try { sessionStorage.setItem(STARTED_KEY, "1"); } catch { /* no-op */ }
      }
    } catch (submitError) {
      const code = (submitError as Error).message;
      if (code === "invalid_email") setError("Please enter a valid business email, or leave the email field empty.");
      else if (code === "invalid_phone") setError("Please enter a valid WhatsApp/phone (digits, spaces, + ( ) - . only) or leave it empty.");
      else if (code === "conversation_closed") {
        setStatus("closed");
        setError("This conversation was closed. Start a new chat to contact the team again.");
      } else setError("Your message could not be sent. Please retry or use WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = () => {
    clearTyping();
    const created = createCredentials();
    credentialsRef.current = created;
    visitorContextRef.current = {};
    try {
      sessionStorage.setItem(SESSION_KEY, created.sessionId);
      sessionStorage.setItem(TOKEN_KEY, created.visitorToken);
      sessionStorage.removeItem(STARTED_KEY);
    } catch {
      // Memory-only fallback.
    }
    setMessages([]);
    setStatus("waiting");
    setStarted(false);
    setInput("");
    setError(null);
    void reportPresence();
  };

  return (
    <>
      {!open && (
        <button ref={launcherRef} type="button" onClick={() => setOpen(true)} aria-label="Open live chat with the Irha Apparels team" aria-haspopup="dialog" className="fixed bottom-6 left-6 z-[61] hidden min-h-12 items-center gap-2 rounded-full border border-gold/70 bg-gold px-5 text-background shadow-elegant transition-transform hover:scale-[1.02] md:inline-flex">
          <Headphones size={18} /><span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Chat with Irha Team</span>
        </button>
      )}

      {open && (
        <section role="dialog" aria-modal="true" aria-labelledby="live-team-title" data-chat-kind="human" style={mobileViewportStyle} className="fixed inset-x-2 top-[calc(env(safe-area-inset-top)+0.4rem)] bottom-[calc(0.4rem+env(safe-area-inset-bottom))] z-[90] flex flex-col overflow-hidden rounded-2xl border border-gold/35 bg-background shadow-elegant animate-fade-in md:inset-auto md:left-6 md:bottom-6 md:h-[min(700px,calc(100vh-3rem))] md:w-[420px]">
          <header className="shrink-0 border-b border-border/60 bg-card px-3 py-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-background"><Headphones size={18} /></span>
                <div className="min-w-0"><h2 id="live-team-title" className="font-display text-lg leading-tight">Live Chat — Irha Team</h2><p className="mt-0.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Real human support</p></div>
              </div>
              <div className="flex items-center gap-2">{started && <button type="button" onClick={() => void poll(true)} disabled={polling} aria-label="Refresh conversation" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/60 text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-50"><RefreshCw size={16} className={polling ? "animate-spin" : ""} /></button>}<button type="button" onClick={close} aria-label="Close live team chat" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/60 text-muted-foreground hover:text-foreground"><X size={18} /></button></div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/45 px-3 py-2 text-[10px] leading-relaxed text-foreground/65"><span>{started ? statusLabel(status) : "Your message goes directly to the admin dashboard"}</span><span className="shrink-0 font-semibold text-gold">HUMAN</span></div>
          </header>

          <div ref={scrollRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
            <div className="max-w-[94%] rounded-xl border border-gold/30 bg-gold/[0.07] px-3.5 py-3 text-sm leading-relaxed text-foreground/85">This is a real human chat. Send your product, quantity or order question and it will appear in the Irha Apparels admin dashboard. Pricing remains subject to formal requirement review.</div>
            {!started && <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2"><label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Your name *<input value={visitorName} onChange={(event) => setVisitorName(event.target.value)} maxLength={160} autoComplete="name" placeholder="Your name" className="mt-1 min-h-11 w-full rounded-lg border border-border/60 bg-card px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-gold" /></label><label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Company (optional)<input value={visitorCompany} onChange={(event) => setVisitorCompany(event.target.value)} maxLength={160} autoComplete="organization" placeholder="Company or brand" className="mt-1 min-h-11 w-full rounded-lg border border-border/60 bg-card px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-gold" /></label><label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2">Business email (optional)<input type="email" value={visitorEmail} onChange={(event) => setVisitorEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="name@company.com" className="mt-1 min-h-11 w-full rounded-lg border border-border/60 bg-card px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-gold" /></label></div>}
            {messages.map((message) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-gold/35 bg-gold/10 text-foreground"}`}><p>{message.message}</p><p className={`mt-1.5 text-[9px] ${message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{message.role === "admin" ? "Irha Team · " : "You · "}{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>)}
            {adminTyping && status !== "closed" && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-2.5 text-sm text-emerald-200"><span className="inline-flex items-center gap-2"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300 [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300 [animation-delay:240ms]" /></span>Irha team is typing…</span></div></div>}
          </div>

          <footer className="shrink-0 border-t border-border/60 bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {error && <p role="alert" className="mb-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">{error}</p>}
            {status === "closed" ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={startNewConversation} className="min-h-11 rounded-lg border border-gold/60 px-3 text-[10px] uppercase tracking-[0.14em] text-gold hover:bg-gold hover:text-background">New conversation</button><a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#25D366]/60 px-3 text-[10px] uppercase tracking-[0.14em] text-[#25D366]"><MessageCircle size={14} /> WhatsApp</a></div> : <form onSubmit={submit}><div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background p-2 focus-within:border-gold"><textarea ref={inputRef} value={input} onChange={(event) => { setInput(event.target.value); publishTyping(event.target.value); }} onBlur={() => window.setTimeout(() => { if (document.activeElement !== inputRef.current) clearTyping(); }, 200)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !isMobileInteraction()) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} maxLength={2_000} enterKeyHint="send" placeholder={started ? "Reply to the Irha team…" : "Describe product, quantity or requirement…"} aria-label="Message the Irha live team" disabled={sending} className="min-h-11 max-h-28 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none disabled:opacity-60" /><button type="submit" disabled={sending || !input.trim()} aria-label="Send live team message" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-gold text-background disabled:opacity-40"><Send size={16} /></button></div></form>}
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/8 bg-black/10 px-2.5 py-2 text-[9px] leading-relaxed text-muted-foreground"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-300" /><span>Live typing preview is shared with Irha support only while you type in this message box. It clears when you pause, leave the box or send.</span></div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[8px] uppercase tracking-[0.12em] text-muted-foreground"><span>Secure session · admin replies appear here</span><a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="text-[#25D366] hover:underline">Urgent? WhatsApp</a></div>
          </footer>
        </section>
      )}
    </>
  );
}
