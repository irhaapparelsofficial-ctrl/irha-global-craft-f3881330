import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Headphones, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { whatsappLink } from "@/lib/constants";
import {
  GUIDE_SESSION_MESSAGES_KEY,
  fallbackGuideReply,
  isGuideReplyDuplicate,
  isIncompleteGuideFragment,
  parseStoredGuideMessages,
  redactGuideMessageForSession,
  shouldSendGuideOnEnter,
  type GuideMessage,
  type GuideProvider,
} from "@/lib/irhaGuide";
import {
  supabasePublishableKey,
  supabaseRuntimeUrl,
} from "@/integrations/supabase/client";

const QUICK_PROMPTS = [
  "Which product program fits my brand?",
  "How does private-label sampling work?",
  "What details do you need for a quote?",
  "Show me your Lederhosen and Dirndl range",
];

const WELCOME_TEXT =
  "Welcome to Irha Live Support. I’m the AI guide and can answer product, manufacturing, private-label and sampling questions now. For a direct handover, tap Human Team at any time.";

const OPEN_EVENT = "irha:open-irha-guide";
const OPEN_HUMAN_EVENT = "irha:open-human-chat";
const CLOUDFLARE_GUIDE_ENDPOINT = "/api/guide";
const SUPABASE_GUIDE_ENDPOINT = `${supabaseRuntimeUrl}/functions/v1/chat`;
const FALLBACK_STATUSES = new Set([404, 502, 503]);

function makeId() {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return `guide-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function makeMessage(
  role: GuideMessage["role"],
  content: string,
  provider?: GuideProvider,
): GuideMessage {
  return { id: makeId(), role, content, provider };
}

function initialMessages(): GuideMessage[] {
  if (typeof window !== "undefined") {
    const stored = parseStoredGuideMessages(sessionStorage.getItem(GUIDE_SESSION_MESSAGES_KEY));
    if (stored.length > 0) return stored;
  }
  return [makeMessage("assistant", WELCOME_TEXT, "idle")];
}

function getSessionId() {
  if (typeof window === "undefined") return makeId();
  try {
    let sessionId = sessionStorage.getItem("irha:chat-sid");
    if (!sessionId) {
      sessionId = makeId();
      sessionStorage.setItem("irha:chat-sid", sessionId);
    }
    return sessionId;
  } catch {
    return makeId();
  }
}

function isMobileInteraction() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
}

function normalizeProvider(value: string | null): GuideProvider {
  if (value === "lovable-ai-gateway") return "lovable-ai-gateway";
  if (value === "gemini" || value === "cloudflare-workers-ai") return "gemini";
  return "deterministic-backup";
}

function providerLabel(provider: GuideProvider) {
  if (provider === "lovable-ai-gateway" || provider === "gemini") return "AI guide active";
  if (provider === "deterministic-backup") return "Verified knowledge mode";
  return "Ready to assist";
}

function currentPageContext() {
  if (typeof window === "undefined") return { path: "/", title: "Irha Apparels" };
  return {
    path: window.location.pathname.slice(0, 300),
    title: document.title.slice(0, 240),
  };
}

async function requestGuide(body: string) {
  const cloudflareResponse = await fetch(CLOUDFLARE_GUIDE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (cloudflareResponse.ok || !FALLBACK_STATUSES.has(cloudflareResponse.status)) {
    return cloudflareResponse;
  }

  return fetch(SUPABASE_GUIDE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
    },
    body,
  });
}

export default function LiveChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<GuideMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<GuideProvider>(() => {
    const restored = initialMessages().slice().reverse().find((message) => message.provider && message.provider !== "idle");
    return restored?.provider ?? "idle";
  });
  const [mobileViewportStyle, setMobileViewportStyle] = useState<CSSProperties>();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const sessionIdRef = useRef<string>(getSessionId());
  const inFlightRef = useRef(false);
  const messagesRef = useRef(messages);

  const commitMessages = useCallback((updater: (previous: GuideMessage[]) => GuideMessage[]) => {
    setMessages((previous) => {
      const next = updater(previous);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const replaceAssistant = useCallback((id: string, content: string, nextProvider: GuideProvider) => {
    commitMessages((previous) => previous.map((message) => (
      message.id === id ? { ...message, content, provider: nextProvider } : message
    )));
  }, [commitMessages]);

  useEffect(() => {
    const openGuide = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, openGuide);
    return () => window.removeEventListener(OPEN_EVENT, openGuide);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      const safe = messages
        .filter((message) => message.content.trim())
        .slice(-24)
        .map((message) => ({
          ...message,
          content: redactGuideMessageForSession(message.content),
        }));
      sessionStorage.setItem(GUIDE_SESSION_MESSAGES_KEY, JSON.stringify(safe));
    } catch {
      // Session persistence is optional; chat continues in memory.
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!open || isMobileInteraction()) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => launcherRef.current?.focus(), 0);
      }
    };

    const mobile = isMobileInteraction();
    const previousOverflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    const updateViewport = () => {
      if (!mobile || !window.visualViewport) {
        setMobileViewportStyle(undefined);
        return;
      }
      const viewport = window.visualViewport;
      setMobileViewportStyle({
        top: Math.max(6, viewport.offsetTop + 6),
        bottom: "auto",
        height: Math.max(320, viewport.height - 12),
      });
    };

    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("orientationchange", updateViewport);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      if (mobile) document.body.style.overflow = previousOverflow;
      setMobileViewportStyle(undefined);
    };
  }, [open]);

  const closeChat = () => {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  };

  const openHumanTeam = () => {
    setOpen(false);
    for (const delay of [0, 180]) {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_HUMAN_EVENT)), delay);
    }
  };

  const send = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || inFlightRef.current) return;

    const previousAssistantReplies = messagesRef.current
      .filter((message) => message.role === "assistant" && message.content.trim())
      .map((message) => message.content)
      .slice(-4);
    const userMessage = makeMessage("user", text);
    const assistantId = makeId();
    const assistantPlaceholder: GuideMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      provider: "idle",
    };
    const requestHistory = [...messagesRef.current.filter((message) => message.content.trim()), userMessage]
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content }));

    inFlightRef.current = true;
    setLoading(true);
    setInput("");
    commitMessages((previous) => [...previous, userMessage, assistantPlaceholder]);

    if (isIncompleteGuideFragment(text)) {
      const reply = fallbackGuideReply(text, previousAssistantReplies);
      replaceAssistant(assistantId, reply, "deterministic-backup");
      setProvider("deterministic-backup");
      setLoading(false);
      inFlightRef.current = false;
      return;
    }

    let finalContent = "";
    let resolvedProvider: GuideProvider = "deterministic-backup";

    try {
      const body = JSON.stringify({
        sessionId: sessionIdRef.current,
        messages: requestHistory,
        pageContext: currentPageContext(),
        clientVersion: "irha-live-support-v4",
      });
      const response = await requestGuide(body);

      if (!response.ok || !response.body) throw new Error(`guide-unavailable-${response.status}`);

      resolvedProvider = normalizeProvider(response.headers.get("X-Irha-AI-Provider"));
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processLine = (line: string) => {
          const valueLine = line.trim();
          if (!valueLine.startsWith("data:")) return;
          const data = valueLine.slice(5).trim();
          if (!data || data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              finalContent += delta;
              replaceAssistant(assistantId, finalContent, resolvedProvider);
            }
          } catch {
            // Ignore keepalive or malformed non-content events.
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          lines.forEach(processLine);
        }
        if (buffer.trim()) processLine(buffer);
      } else {
        const payload = await response.json().catch(() => ({}));
        const answer = payload?.answer ?? payload?.choices?.[0]?.message?.content;
        if (typeof answer === "string") finalContent = answer.trim();
      }

      if (!finalContent.trim() || isGuideReplyDuplicate(finalContent, previousAssistantReplies)) {
        finalContent = fallbackGuideReply(text, previousAssistantReplies);
        resolvedProvider = "deterministic-backup";
      }
    } catch {
      finalContent = fallbackGuideReply(text, previousAssistantReplies);
      resolvedProvider = "deterministic-backup";
    } finally {
      replaceAssistant(assistantId, finalContent || fallbackGuideReply(text, previousAssistantReplies), resolvedProvider);
      setProvider(resolvedProvider);
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [commitMessages, replaceAssistant]);

  const showActions = messages.length > 1 && !loading;

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Irha Live Support — AI guide and human team"
          aria-haspopup="dialog"
          className="fixed bottom-[calc(5.55rem+env(safe-area-inset-bottom))] right-3 z-[68] flex w-[min(21rem,calc(100vw-1.5rem))] items-center gap-3 rounded-2xl border border-gold/55 bg-black/95 px-3.5 py-3 text-left text-white shadow-[0_18px_55px_rgba(0,0,0,.72)] backdrop-blur-xl transition-transform hover:scale-[1.01] md:bottom-auto md:right-4 md:top-24 md:h-12 md:w-12 md:justify-center md:rounded-full md:p-0"
        >
          <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold">
            <MessageCircle size={20} />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-black bg-emerald-400" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 md:hidden">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Irha Live Support</span>
            <span className="mt-1 block text-[11px] leading-snug text-white/75">AI answers now · Human team one tap away</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-gold md:hidden" />
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="irha-guide-title"
          data-chat-kind="ai-guide"
          style={mobileViewportStyle}
          className="fixed z-[80] inset-x-2 top-[calc(env(safe-area-inset-top)+0.4rem)] bottom-[calc(0.4rem+env(safe-area-inset-bottom))] flex flex-col overflow-hidden rounded-2xl border border-gold/35 bg-background shadow-[0_24px_80px_rgba(0,0,0,.78)] animate-fade-in md:inset-auto md:bottom-6 md:right-6 md:h-[min(720px,calc(100vh-3rem))] md:w-[430px]"
        >
          <header className="shrink-0 border-b border-border/60 bg-gradient-to-br from-card via-card to-background px-3 py-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground">
                  <Sparkles size={18} />
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-400" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="irha-guide-title" className="font-display text-lg leading-tight">Irha Live Support</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    {providerLabel(provider)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeChat}
                aria-label="Close Irha Live Support"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border/60 text-foreground/70 hover:border-gold hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-border/60 bg-background/70">
              <div className="flex min-h-12 items-center justify-center gap-2 bg-gold/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                <Sparkles size={14} /> AI Guide
              </div>
              <button
                type="button"
                onClick={openHumanTeam}
                className="flex min-h-12 items-center justify-center gap-2 border-l border-border/60 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/80 hover:bg-emerald-400/10 hover:text-emerald-300"
              >
                <Headphones size={14} /> Human Team
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={loading}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-background p-3 sm:p-4"
          >
            <div className="rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-3 text-xs leading-relaxed text-foreground/75">
              Ask naturally. The guide remembers this conversation, uses the live catalogue and avoids repeating previous answers. Commercial terms are confirmed by the human team.
            </div>

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words sm:text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-border/60 bg-card text-foreground/90"}`}>
                  {message.role === "assistant" && (
                    <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-gold">Irha AI Guide</p>
                  )}
                  {message.content || (loading ? (
                    <span className="inline-flex gap-1 py-1" aria-label="Irha Guide is responding">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40" aria-hidden="true" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40 [animation-delay:0.2s]" aria-hidden="true" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40 [animation-delay:0.4s]" aria-hidden="true" />
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="space-y-2 pt-1">
                <p className="text-[9px] uppercase tracking-[0.22em] text-foreground/50">Popular questions</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {QUICK_PROMPTS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void send(question)}
                      className="min-h-11 rounded-lg border border-border/60 px-3 py-2 text-left text-[11px] leading-snug transition-colors hover:border-gold hover:text-gold"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showActions && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Link to="/products" onClick={closeChat} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border/60 px-2 py-2.5 text-center text-[9px] uppercase tracking-[0.13em] hover:border-gold hover:text-gold">Products</Link>
                <Link to="/inquiry?intent=rfq" onClick={closeChat} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gold/60 px-2 py-2.5 text-center text-[9px] uppercase tracking-[0.13em] text-gold">Get Quote</Link>
                <button type="button" onClick={openHumanTeam} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-400/50 px-2 py-2.5 text-center text-[9px] uppercase tracking-[0.13em] text-emerald-300">Human Team</button>
              </div>
            )}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="shrink-0 border-t border-border/60 bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (shouldSendGuideOnEnter({
                    key: event.key,
                    shiftKey: event.shiftKey,
                    isMobile: isMobileInteraction(),
                    text: input,
                  })) {
                    event.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                maxLength={2000}
                enterKeyHint="send"
                aria-label="Message Irha AI Guide"
                placeholder="Ask about a product, sample, branding or quotation…"
                disabled={loading}
                className="min-h-12 max-h-28 min-w-0 flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-3 text-sm outline-none focus:border-gold disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message to Irha Guide"
                className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground transition-all hover:shadow-gold disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[8px] uppercase tracking-[0.12em] text-foreground/40">
              <span>Conversation-aware AI guidance</span>
              <a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[#25D366] hover:underline"><MessageCircle size={11} /> WhatsApp</a>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
