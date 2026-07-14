import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { whatsappLink } from "@/lib/constants";
import {
  GUIDE_SESSION_MESSAGES_KEY,
  fallbackGuideReply,
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
  "Do you offer private label?",
  "Show me your Lederhosen range",
  "How does sampling work?",
  "Welche Kollektionen habt ihr?",
];

const WELCOME_TEXT =
  "Hi! I'm Irha Guide — your product and manufacturing assistant. Ask in English or German. For pricing or a formal quotation, use the inquiry form or WhatsApp.\n\nHallo! Ich bin Irha Guide — fragen Sie mich gerne auf Deutsch.";

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
  if (value === "gemini") return "gemini";
  return "deterministic-backup";
}

function providerLabel(provider: GuideProvider) {
  if (provider === "lovable-ai-gateway" || provider === "gemini") return "Smart guide";
  if (provider === "deterministic-backup") return "Verified backup";
  return "Ask a question";
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
    messagesRef.current = messages;
    try {
      const safe = messages
        .filter((message) => message.content.trim())
        .slice(-20)
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
        top: Math.max(8, viewport.offsetTop + 8),
        bottom: "auto",
        height: Math.max(280, viewport.height - 16),
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

  const send = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || inFlightRef.current) return;

    const userMessage = makeMessage("user", text);
    const assistantId = makeId();
    const assistantPlaceholder: GuideMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      provider: "idle",
    };
    const requestHistory = [...messagesRef.current.filter((message) => message.content.trim()), userMessage]
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.content }));

    inFlightRef.current = true;
    setLoading(true);
    setInput("");
    commitMessages((previous) => [...previous, userMessage, assistantPlaceholder]);

    if (isIncompleteGuideFragment(text)) {
      const reply = fallbackGuideReply(text);
      replaceAssistant(assistantId, reply, "deterministic-backup");
      setProvider("deterministic-backup");
      setLoading(false);
      inFlightRef.current = false;
      return;
    }

    let finalContent = "";
    let resolvedProvider: GuideProvider = "deterministic-backup";

    try {
      const response = await fetch(`${supabaseRuntimeUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabasePublishableKey}`,
          apikey: supabasePublishableKey,
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          messages: requestHistory,
        }),
      });

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

      if (!finalContent.trim()) {
        finalContent = fallbackGuideReply(text);
        resolvedProvider = "deterministic-backup";
      }
    } catch {
      finalContent = fallbackGuideReply(text);
      resolvedProvider = "deterministic-backup";
    } finally {
      replaceAssistant(assistantId, finalContent || fallbackGuideReply(text), resolvedProvider);
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
          aria-label="Open Irha Guide"
          aria-haspopup="dialog"
          className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-[11.5rem] md:bottom-6 z-[60] group min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground rounded-full pl-3 pr-4 py-3 shadow-gold hover:scale-105 transition-transform"
        >
          <Sparkles size={20} />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] hidden sm:inline">Irha Guide</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="irha-guide-title"
          style={mobileViewportStyle}
          className="fixed z-[80] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(0.75rem+env(safe-area-inset-bottom))] md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[min(680px,calc(100vh-3rem))] flex flex-col bg-background border border-border shadow-elegant rounded-sm overflow-hidden animate-fade-in"
        >
          <div className="shrink-0 bg-gradient-to-r from-card to-background border-b border-border/60 px-3 py-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center shrink-0" aria-hidden="true">
                  <Sparkles size={15} className="text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p id="irha-guide-title" className="font-display text-base leading-tight">Irha Guide</p>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-foreground/55 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
                    Available · {providerLabel(provider)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Chat on WhatsApp"
                  className="min-h-10 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] bg-[#25D366] text-white px-2.5 py-2 rounded-full"
                >
                  <MessageCircle size={12} /> <span className="hidden xs:inline">WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={closeChat}
                  aria-label="Close Irha Guide"
                  className="min-w-11 min-h-11 inline-flex items-center justify-center border border-border/60 text-foreground/70 hover:text-foreground hover:border-gold transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={loading}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 bg-background"
          >
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  aria-label={message.role === "user" ? "Your message" : "Irha Guide response"}
                  className={`max-w-[88%] px-3.5 py-2.5 text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words rounded-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border/60 text-foreground/90"}`}
                >
                  {message.content || (loading ? (
                    <span className="inline-flex gap-1 py-1" aria-label="Irha Guide is responding">
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse" aria-hidden="true" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse [animation-delay:0.2s]" aria-hidden="true" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse [animation-delay:0.4s]" aria-hidden="true" />
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="pt-1 space-y-2">
                <p className="text-[9px] uppercase tracking-[0.22em] text-foreground/50">Quick questions</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void send(question)}
                      className="min-h-10 text-[11px] px-3 py-1.5 border border-border/60 hover:border-primary hover:text-primary transition-colors rounded-sm"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showActions && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Link to="/products" onClick={closeChat} className="min-h-11 inline-flex items-center justify-center text-center text-[9px] uppercase tracking-[0.15em] border border-border/60 px-2 py-2.5 hover:border-gold hover:text-gold">Products</Link>
                <Link to="/inquiry?intent=rfq" onClick={closeChat} className="min-h-11 inline-flex items-center justify-center text-center text-[9px] uppercase tracking-[0.15em] border border-gold/60 text-gold px-2 py-2.5">Get Quote</Link>
                <a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="min-h-11 inline-flex items-center justify-center text-center text-[9px] uppercase tracking-[0.15em] border border-[#25D366]/60 text-[#25D366] px-2 py-2.5">WhatsApp</a>
              </div>
            )}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="shrink-0 border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-card">
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
                enterKeyHint="enter"
                aria-label="Message Irha Guide"
                placeholder="Ask about products or manufacturing… (EN / DE)"
                disabled={loading}
                className="min-h-11 min-w-0 flex-1 resize-none bg-background border border-border/60 focus:border-primary outline-none text-sm px-3 py-2.5 rounded-sm max-h-24"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="min-h-11 min-w-11 shrink-0 inline-flex items-center justify-center bg-gradient-gold text-primary-foreground rounded-sm disabled:opacity-40 hover:shadow-gold transition-all"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[8px] uppercase tracking-[0.16em] text-foreground/40 mt-2 text-center">
              Messages may be stored for service follow-up · Answers are non-binding
            </p>
          </form>
        </section>
      )}
    </>
  );
}
