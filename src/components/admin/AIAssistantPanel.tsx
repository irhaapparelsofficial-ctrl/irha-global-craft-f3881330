import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Write an Instagram caption for our new Bavarian Lederhosen collection",
  "Draft a reply to a German boutique asking about MOQ for streetwear hoodies",
  "5 hashtag sets for sportswear B2B posts",
  "Translate this to German: ...",
];

export default function AIAssistantPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: prompt }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Add empty assistant message we'll fill in.
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: copy[copy.length - 1].content + delta,
                };
                return copy;
              });
            }
          } catch {
            /* ignore partial */
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: "AI error", description: msg, variant: "destructive" });
      setMessages((m) => m.filter((_, i) => i < next.length));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="border border-border/60 bg-card/30 flex flex-col h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-gold" />
          <p className="eyebrow !mb-0">Irha Atelier AI · Gemini</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
          >
            <Trash2 size={11} /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6">
            <div>
              <Sparkles size={28} className="text-gold mx-auto mb-3" />
              <h3 className="font-display text-2xl">Your private AI co-pilot</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Captions, buyer replies, product copy, translations, strategy. Ask anything.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="text-left text-xs border border-border/60 p-3 hover:border-primary hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] bg-primary/10 border border-primary/30 px-4 py-3 text-sm"
                  : "mr-auto max-w-[90%] border-l-2 border-gold/60 pl-4 text-sm text-foreground/90"
              }
            >
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                {m.role === "user" ? "You" : "Atelier AI"}
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">
                {m.content}
                {streaming && i === messages.length - 1 && m.role === "assistant" && (
                  <span className="inline-block w-2 h-4 bg-gold/70 ml-1 animate-pulse align-middle" />
                )}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-border/60 p-3 flex gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask Atelier AI… (Shift+Enter for new line)"
          rows={2}
          disabled={streaming}
          className="flex-1 bg-background/60 border border-border/60 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="self-stretch px-4 bg-gold text-background hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em]"
        >
          {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}
