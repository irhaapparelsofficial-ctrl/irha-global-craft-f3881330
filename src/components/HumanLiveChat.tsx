import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Headphones, MessageCircle, RefreshCw, Send, X } from "lucide-react";
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

type ApiResponse = {
  ok?: boolean;
  status?: ConversationStatus;
  messages?: LiveMessage[];
  error?: string;
};

const SESSION_KEY = "irha:human-chat-session";
const TOKEN_KEY = "irha:human-chat-token";
const STARTED_KEY = "irha:human-chat-started";

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createCredentials() {
  return {
    sessionId: `human-${crypto.randomUUID()}`,
    visitorToken: randomToken(),
  };
}

function readStoredCredentials() {
  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    const visitorToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionId && visitorToken) return { sessionId, visitorToken };
  } catch {
    // Storage may be blocked. A memory-only session still works.
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

function statusLabel(status: ConversationStatus) {
  if (status === "active") return "Team joined";
  if (status === "closed") return "Conversation closed";
  return "Waiting for team";
}

export default function HumanLiveChat() {
  const credentialsRef = useRef(readStoredCredentials());
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(wasStarted());
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [status, setStatus] = useState<ConversationStatus>("waiting");
  const [visitorName, setVisitorName] = useState("");
  const [visitorCompany, setVisitorCompany] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callApi = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch(`${supabaseRuntimeUrl}/functions/v1/live-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabasePublishableKey}`,
        apikey: supabasePublishableKey,
      },
      body: JSON.stringify({
        ...credentialsRef.current,
        ...payload,
      }),
    });

    const body = await response.json().catch(() => ({ error: "invalid_response" })) as ApiResponse;
    if (!response.ok) {
      const apiError = new Error(body.error || "live_chat_unavailable");
      (apiError as Error & { status?: number }).status = response.status;
      throw apiError;
    }
    return body;
  }, []);

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
      setError("Team chat could not refresh. Your message box is still available; retry in a moment or use WhatsApp.");
    } finally {
      if (showSpinner) setPolling(false);
    }
  }, [callApi, started]);

  useEffect(() => {
    if (!started || !open) return;
    void poll(true);
    const interval = window.setInterval(() => { void poll(false); }, 2_500);
    return () => window.clearInterval(interval);
  }, [open, poll, started]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, started]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => launcherRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (isMobile) document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending || status === "closed") return;
    if (!started && (!visitorName.trim() || !visitorCompany.trim())) {
      setError("Please add your name and company so the team knows who is contacting them.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const body = await callApi({
        action: started ? "send" : "connect",
        message,
        clientMessageId: crypto.randomUUID(),
        visitorName: visitorName.trim(),
        visitorCompany: visitorCompany.trim(),
        visitorEmail: visitorEmail.trim(),
      });
      setMessages(body.messages ?? []);
      setStatus(body.status ?? "waiting");
      setInput("");
      if (!started) {
        setStarted(true);
        try { sessionStorage.setItem(STARTED_KEY, "1"); } catch { /* no-op */ }
      }
    } catch (submitError) {
      const code = (submitError as Error).message;
      if (code === "invalid_email") {
        setError("Please enter a valid business email, or leave the email field empty.");
      } else if (code === "conversation_closed") {
        setStatus("closed");
        setError("This conversation was closed. Start a new chat to contact the team again.");
      } else {
        setError("Your message could not be sent. Please retry or use WhatsApp.");
      }
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = () => {
    const created = createCredentials();
    credentialsRef.current = created;
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
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open live team chat"
          aria-haspopup="dialog"
          className="fixed left-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:left-6 md:bottom-6 z-[61] min-h-11 inline-flex items-center gap-2 rounded-full border border-gold/70 bg-card/95 px-3.5 py-3 text-gold shadow-elegant backdrop-blur hover:bg-gold hover:text-background transition-colors"
        >
          <Headphones size={19} />
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em]">Live Team</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-team-title"
          className="fixed z-[81] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:inset-auto md:left-6 md:bottom-6 md:w-[410px] md:h-[min(700px,calc(100vh-3rem))] flex flex-col overflow-hidden rounded-sm border border-border bg-background shadow-elegant animate-fade-in"
        >
          <header className="shrink-0 border-b border-border/60 bg-card px-3 py-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-gold shrink-0" aria-hidden="true"><Headphones size={17} /></span>
                <div className="min-w-0">
                  <h2 id="live-team-title" className="font-display text-base leading-tight">Irha Live Team</h2>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : status === "closed" ? "bg-muted-foreground" : "bg-amber-400"}`} />
                    {started ? statusLabel(status) : "Direct message to admin"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {started && (
                  <button type="button" onClick={() => void poll(true)} disabled={polling} aria-label="Refresh conversation" className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60 text-muted-foreground hover:text-gold hover:border-gold disabled:opacity-50">
                    <RefreshCw size={16} className={polling ? "animate-spin" : ""} />
                  </button>
                )}
                <button type="button" onClick={close} aria-label="Close live team chat" className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60 text-muted-foreground hover:text-foreground"><X size={18} /></button>
              </div>
            </div>
          </header>

          <div ref={scrollRef} role="log" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            <div className="max-w-[90%] rounded-sm border border-border/60 bg-card px-3.5 py-3 text-sm leading-relaxed text-foreground/85">
              Send your product or order question directly to the Irha Apparels admin team. Pricing remains subject to formal requirement review. For urgent contact, WhatsApp is available below.
            </div>

            {!started && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Your name *
                  <input value={visitorName} onChange={(event) => setVisitorName(event.target.value)} maxLength={160} autoComplete="name" className="mt-1 min-h-11 w-full border border-border/60 bg-card px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-gold" />
                </label>
                <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Company *
                  <input value={visitorCompany} onChange={(event) => setVisitorCompany(event.target.value)} maxLength={160} autoComplete="organization" className="mt-1 min-h-11 w-full border border-border/60 bg-card px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-gold" />
                </label>
                <label className="sm:col-span-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Business email (optional)
                  <input type="email" value={visitorEmail} onChange={(event) => setVisitorEmail(event.target.value)} maxLength={254} autoComplete="email" className="mt-1 min-h-11 w-full border border-border/60 bg-card px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-gold" />
                </label>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-gold/35 bg-gold/10 text-foreground"}`}>
                  <p>{message.message}</p>
                  <p className={`mt-1.5 text-[9px] ${message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{message.role === "admin" ? "Irha Team · " : "You · "}{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}

            {started && messages.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Conversation connected. Send a message below.</p>
            )}
          </div>

          <footer className="shrink-0 border-t border-border/60 bg-card p-3">
            {error && <p role="alert" className="mb-2 border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">{error}</p>}

            {status === "closed" ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={startNewConversation} className="min-h-11 border border-gold/60 px-3 text-[10px] uppercase tracking-[0.14em] text-gold hover:bg-gold hover:text-background">New conversation</button>
                <a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="min-h-11 inline-flex items-center justify-center gap-2 border border-[#25D366]/60 px-3 text-[10px] uppercase tracking-[0.14em] text-[#25D366]"><MessageCircle size={14} /> WhatsApp</a>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={1}
                    maxLength={2_000}
                    placeholder={started ? "Reply to the Irha team…" : "Describe the product, quantity or requirement…"}
                    aria-label="Message the Irha live team"
                    disabled={sending}
                    className="min-h-11 max-h-28 min-w-0 flex-1 resize-none border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-gold disabled:opacity-60"
                  />
                  <button type="submit" disabled={sending || !input.trim()} aria-label="Send live team message" className="min-h-11 min-w-11 inline-flex items-center justify-center bg-gold text-background disabled:opacity-40"><Send size={16} /></button>
                </div>
              </form>
            )}

            <div className="mt-2 flex items-center justify-between gap-3 text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>Secure session · admin replies appear here</span>
              <a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="text-[#25D366] hover:underline">WhatsApp</a>
            </div>
          </footer>
        </section>
      )}
    </>
  );
}
