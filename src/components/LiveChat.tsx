import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { whatsappLink } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "What's your MOQ?",
  "Lead time for hoodies?",
  "Do you do custom embroidery?",
  "Bavarian lederhosen pricing",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi! I'm the Irha Assistant 👋\nAsk me anything about our collections, MOQs, lead times, or customization. For instant human support, tap WhatsApp below.",
};

export default function LiveChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current) {
    try {
      let s = sessionStorage.getItem("irha:chat-sid");
      if (!s) { s = crypto.randomUUID(); sessionStorage.setItem("irha:chat-sid", s); }
      sessionIdRef.current = s;
    } catch { sessionIdRef.current = crypto.randomUUID(); }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    // Log user message for the admin dashboard
    void supabase.from("chat_messages").insert({
      session_id: sessionIdRef.current,
      role: "user",
      message: userMsg.content,
    });



    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(err.error || "Chat error");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            // skip non-JSON keepalives
          }
        }
      }

      if (!acc) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Sorry, I didn't catch that. Could you rephrase?",
          };
          return copy;
        });
      } else {
        // Log assistant reply for dashboard
        void supabase.from("chat_messages").insert({
          session_id: sessionIdRef.current,
          role: "assistant",
          message: acc,
        });
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection error";
      setError(msg);
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `⚠ ${msg}\n\nPlease try again or reach us on WhatsApp +92 320 411 0066.`,
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open live chat"
        className="fixed bottom-24 right-6 z-40 group flex items-center gap-2 bg-gradient-gold text-primary-foreground rounded-full pl-3 pr-4 py-3 shadow-gold hover:scale-105 transition-transform"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] hidden sm:inline">
          {open ? "Close" : "Live Chat"}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-44 right-6 z-40 w-[calc(100vw-3rem)] sm:w-[400px] max-h-[70vh] flex flex-col bg-background border border-border shadow-elegant rounded-sm overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-card to-background border-b border-border/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Sparkles size={16} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="font-display text-base leading-tight">Irha Assistant</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online · AI-powered
                  </p>
                </div>
              </div>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] bg-[#25D366] text-white px-3 py-2 rounded-full hover:scale-105 transition-transform"
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap rounded-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/60 text-foreground/90"
                  }`}
                >
                  {m.content || (loading && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse [animation-delay:0.4s]" />
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/50">Quick questions</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-xs px-3 py-1.5 border border-border/60 hover:border-primary hover:text-primary transition-colors rounded-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-border/60 p-3 bg-card"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Ask about MOQ, fabrics, lead time..."
                disabled={loading}
                className="flex-1 resize-none bg-background border border-border/60 focus:border-primary outline-none text-sm px-3 py-2.5 rounded-sm max-h-28"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="bg-gradient-gold text-primary-foreground p-2.5 rounded-sm disabled:opacity-40 hover:shadow-gold transition-all"
              >
                <Send size={16} />
              </button>
            </div>
            {error && <p className="text-[10px] text-destructive mt-2">{error}</p>}
            <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/40 mt-2 text-center">
              AI replies may be approximate · Confirm details on WhatsApp
            </p>
          </form>
        </div>
      )}
    </>
  );
}

// Avoid tree-shaking the supabase import
void supabase;

