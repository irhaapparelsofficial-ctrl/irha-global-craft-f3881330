import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Send, X } from "lucide-react";
import { supabasePublishableKey, supabaseRuntimeUrl } from "@/integrations/supabase/client";

const SESSION_KEY = "irha:human-chat-session";
const TOKEN_KEY = "irha:human-chat-token";

type ChatMessage = {
  id: string;
  role: "user" | "admin";
  message: string;
  created_at: string;
  client_message_id: string | null;
};

type ChatResponse = {
  ok?: boolean;
  error?: string;
  status?: "pending" | "open" | "resolved" | "closed";
  messages?: ChatMessage[];
};

function randomCredential() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function getCredentials() {
  try {
    let sessionId = localStorage.getItem(SESSION_KEY);
    let visitorToken = localStorage.getItem(TOKEN_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    if (!visitorToken) {
      visitorToken = randomCredential();
      localStorage.setItem(TOKEN_KEY, visitorToken);
    }
    return { sessionId, visitorToken };
  } catch {
    return { sessionId: crypto.randomUUID(), visitorToken: randomCredential() };
  }
}

function clearCredentials() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing may block storage; the current page session still works.
  }
}

function errorText(code?: string) {
  if (code === "contact_required") return "Add an email address or WhatsApp number.";
  if (code === "invalid_email") return "Enter a valid email address.";
  if (code === "rate_limited") return "Too many requests. Please wait a moment and try again.";
  if (code === "session_not_found") return "This chat session expired. Start a new conversation.";
  return "Live support is temporarily unavailable. Please use WhatsApp or the inquiry form.";
}

export default function HumanLiveChat() {
  const credentialsRef = useRef(getCredentials());
  const lastAdminCountRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(() => {
    try {
      return Boolean(localStorage.getItem(SESSION_KEY) && localStorage.getItem(TOKEN_KEY));
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"pending" | "open" | "resolved" | "closed">("pending");
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const request = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch(`${supabaseRuntimeUrl}/functions/v1/live-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabasePublishableKey}`,
        apikey: supabasePublishableKey,
      },
      body: JSON.stringify({
        ...body,
        sessionId: credentialsRef.current.sessionId,
        visitorToken: credentialsRef.current.visitorToken,
      }),
    });
    const payload = await response.json().catch(() => ({})) as ChatResponse;
    if (!response.ok) throw new Error(payload.error || "live_chat_unavailable");
    return payload;
  }, []);

  const applyMessages = useCallback((next: ChatMessage[], nextStatus?: ChatResponse["status"]) => {
    const adminCount = next.filter((item) => item.role === "admin").length;
    if (!open && adminCount > lastAdminCountRef.current) {
      setUnread((value) => value + adminCount - lastAdminCountRef.current);
    }
    lastAdminCountRef.current = adminCount;
    setMessages(next);
    if (nextStatus) setStatus(nextStatus);
  }, [open]);

  const poll = useCallback(async () => {
    if (!started) return;
    try {
      const payload = await request({ action: "poll" });
      applyMessages(payload.messages ?? [], payload.status);
      setError(null);
    } catch (pollError) {
      const code = pollError instanceof Error ? pollError.message : "live_chat_unavailable";
      if (code === "session_not_found" || code === "session_forbidden") {
        clearCredentials();
        credentialsRef.current = getCredentials();
        setStarted(false);
        setMessages([]);
        lastAdminCountRef.current = 0;
      }
    }
  }, [applyMessages, request, started]);

  useEffect(() => {
    if (!started) return;
    void poll();
    const id = window.setInterval(() => void poll(), 8_000);
    return () => window.clearInterval(id);
  }, [poll, started]);

  useEffect(() => {
    if (!open) return;
    setUnread(0);
    window.setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const startChat = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || (!email.trim() && !whatsapp.trim()) || !draft.trim()) {
      setError("Add your name, an email or WhatsApp number, and a message.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await request({
        action: "start",
        clientMessageId: crypto.randomUUID(),
        message: draft,
        visitor: { name, email, whatsapp, company, country },
        context: { path: window.location.pathname + window.location.search, title: document.title },
      });
      setStarted(true);
      setDraft("");
      applyMessages(payload.messages ?? [], payload.status);
    } catch (startError) {
      setError(errorText(startError instanceof Error ? startError.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || loading) return;
    const optimistic: ChatMessage = {
      id: `local-${crypto.randomUUID()}`,
      role: "user",
      message: draft.trim(),
      created_at: new Date().toISOString(),
      client_message_id: crypto.randomUUID(),
    };
    const outgoing = draft.trim();
    setMessages((current) => [...current, optimistic]);
    setDraft("");
    setLoading(true);
    setError(null);
    try {
      const payload = await request({
        action: "message",
        clientMessageId: optimistic.client_message_id,
        message: outgoing,
      });
      applyMessages(payload.messages ?? [], payload.status);
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setDraft(outgoing);
      setError(errorText(sendError instanceof Error ? sendError.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  const statusText = status === "open"
    ? "Conversation open"
    : status === "resolved"
      ? "Resolved · send a message to reopen"
      : status === "closed"
        ? "Closed · send a message to reopen"
        : "Waiting in team inbox";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed z-[61] right-4 bottom-[calc(9.25rem+env(safe-area-inset-bottom))] md:right-[6.5rem] md:bottom-6 min-h-11 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-card/95 px-3.5 py-3 text-gold shadow-2xl backdrop-blur hover:bg-gold hover:text-background transition-colors"
          aria-label="Open Live Support"
          aria-haspopup="dialog"
        >
          <Headphones size={18} />
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.16em]">Live Support</span>
          {unread > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] inline-flex items-center justify-center">{unread}</span>}
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-support-title"
          className="fixed z-[82] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:inset-auto md:right-6 md:bottom-6 md:w-[420px] md:h-[min(720px,calc(100vh-3rem))] flex flex-col bg-background border border-border shadow-elegant rounded-sm overflow-hidden"
        >
          <header className="shrink-0 border-b border-border/60 bg-card px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p id="live-support-title" className="font-display text-lg">Live Support</p>
              <p className="text-[9px] uppercase tracking-[0.16em] text-foreground/50">{statusText}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-border/60 hover:border-gold hover:text-gold" aria-label="Close Live Support">
              <X size={18} />
            </button>
          </header>

          {!started ? (
            <form onSubmit={startChat} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <p className="font-display text-2xl">Talk to the Irha team</p>
                <p className="text-xs text-foreground/55 mt-2 leading-relaxed">Share your product requirement. Your message enters the private team inbox; replies appear in this window.</p>
              </div>
              <Field label="Name *" value={name} onChange={setName} autoComplete="name" />
              <Field label="Company" value={company} onChange={setCompany} autoComplete="organization" />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
                <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} autoComplete="tel" />
              </div>
              <Field label="Country" value={country} onChange={setCountry} autoComplete="country-name" />
              <label className="block">
                <span className="text-[9px] uppercase tracking-[0.16em] text-foreground/55">Requirement *</span>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} maxLength={2000} className="mt-1 w-full resize-none bg-background border border-border/60 focus:border-gold outline-none px-3 py-2 text-sm" placeholder="Product, quantity, material, branding, destination or reference details…" />
              </label>
              {error && <p className="text-xs text-destructive border border-destructive/35 bg-destructive/5 p-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground text-[10px] uppercase tracking-[0.18em] disabled:opacity-50">
                <Send size={14} /> {loading ? "Sending…" : "Start conversation"}
              </button>
              <p className="text-[9px] text-foreground/40 leading-relaxed">Provide only business contact details needed for follow-up. Commercial terms remain subject to requirement review.</p>
            </form>
          ) : (
            <>
              <div ref={scrollRef} role="log" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Conversation is loading…</p>
                ) : messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-gold/35"}`}>
                      <p>{message.message}</p>
                      <p className="text-[8px] opacity-55 mt-1">{new Date(message.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="shrink-0 border-t border-border/60 bg-card p-3">
                {error && <p className="text-xs text-destructive mb-2">{error}</p>}
                <div className="flex items-end gap-2">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} maxLength={2000} disabled={loading} className="min-h-11 min-w-0 flex-1 resize-none bg-background border border-border/60 focus:border-gold outline-none px-3 py-2.5 text-sm max-h-24" placeholder="Write a message…" />
                  <button type="submit" disabled={loading || !draft.trim()} className="min-h-11 min-w-11 inline-flex items-center justify-center bg-gradient-gold text-primary-foreground disabled:opacity-40" aria-label="Send live support message"><Send size={16} /></button>
                </div>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.16em] text-foreground/55">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} maxLength={254} className="mt-1 w-full min-h-11 bg-background border border-border/60 focus:border-gold outline-none px-3 py-2 text-sm" />
    </label>
  );
}
