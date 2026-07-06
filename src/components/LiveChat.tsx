import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { whatsappLink } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type GuideMode = "ai" | "backup";

const QUICK_PROMPTS = [
  "Show me your Lederhosen range",
  "What categories do you manufacture?",
  "How does sampling work?",
  "Welche Kollektionen habt ihr?",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi! I'm Irha Guide — your product and manufacturing assistant. Ask in English or German. For pricing or formal quotations, use the quote form or WhatsApp.\n\nHallo! Ich bin Irha Guide — fragen Sie mich gerne auf Deutsch.",
};

const GERMAN_HINTS = /[äöüß]|\b(wie|welche|preis|kosten|muster|lieferung|fertigung|habt|können|kollektionen)\b/i;

function fallbackReply(text: string): string {
  const q = text.toLowerCase();
  const de = GERMAN_HINTS.test(text);

  if (/(price|cost|quote|rate|how much|preis|kosten|angebot|stückpreis)/i.test(q)) {
    return de
      ? "Preise werden erst nach Prüfung von Produkt, Material, Menge, Branding, Verpackung und Lieferanforderungen bestätigt. Nutzen Sie bitte die Anfrage oder WhatsApp für ein formelles Angebot."
      : "Pricing is confirmed only after review of the product, material, quantity, branding, packaging and delivery requirements. Please use the inquiry form or WhatsApp for a formal quotation.";
  }

  if (/(moq|minimum|mindestmenge)/i.test(q)) {
    return de
      ? "Die Mindestmenge wird je Produktprogramm nach Prüfung von Material, Konstruktion, Branding und Größen-/Farbmix bestätigt."
      : "MOQ is confirmed per product program after review of material, construction, branding and the size or color mix.";
  }

  if (/(sample|sampling|muster)/i.test(q)) {
    return de
      ? "Der Musterprozess richtet sich nach Produkt, Material, Schnittentwicklung, Branding und möglichen Revisionen. Senden Sie eine Skizze, ein Tech-Pack oder ein Referenzbild für die Prüfung."
      : "The sampling path depends on the product, materials, pattern development, branding and possible revisions. Send a sketch, tech pack or reference image for review.";
  }

  if (/(lederhosen|trachten|bavarian|oktoberfest)/i.test(q)) {
    return de
      ? "Wir zeigen kundenspezifische Programme für Lederhosen, Dirndl und Trachten. Öffnen Sie die Kategorie Bavarian & Trachten Wear oder senden Sie Ihre Referenz für eine Prüfung."
      : "We present custom Lederhosen, Dirndl and Trachten programs. Browse Bavarian & Trachten Wear or send your reference for requirement review.";
  }

  if (/(dirndl|blouse|apron|schürze)/i.test(q)) {
    return de
      ? "Dirndl-Programme können Stoff, Mieder, Schürze, Bluse, Verzierungen, Labels und Verpackung umfassen. Die umsetzbare Kombination wird pro Anfrage geprüft."
      : "Dirndl programs can cover fabric, bodice, apron, blouse, decoration, labels and packaging. The workable combination is reviewed per requirement.";
  }

  if (/(leather|jacket|leder)/i.test(q)) {
    return de
      ? "Wir besprechen kundenspezifische Lederbekleidung wie Jacken und Westen. Lederart, Konstruktion, Futter, Beschläge und Branding werden vor dem Angebot geprüft."
      : "We discuss custom leather apparel such as jackets and vests. Leather type, construction, lining, hardware and branding are reviewed before quotation.";
  }

  if (/(sportswear|teamwear|jersey|kit|football|soccer|basketball)/i.test(q)) {
    return de
      ? "Sportswear- und Teamwear-Programme werden nach Stoff, Konstruktion, Druck, Stickerei, Größen und Branding geprüft."
      : "Sportswear and teamwear programs are reviewed around fabric, construction, printing, embroidery, sizing and branding requirements.";
  }

  if (/(streetwear|activewear|hoodie|tracksuit|gym|nightwear|leisure|sleepwear)/i.test(q)) {
    return de
      ? "Wir zeigen Programme für Streetwear, Activewear sowie Leisure- und Nightwear. Senden Sie Ihr Produktbriefing oder eine Referenz für die passende Kategorie."
      : "We present Streetwear, Activewear, Leisurewear and Nightwear programs. Send your product brief or reference so the right category can be reviewed.";
  }

  if (/(factory|video call|visit|manufacturing environment|fabrik|videoanruf)/i.test(q)) {
    return de
      ? "Eine Live-Videoansicht der Fertigungsumgebung kann während der Anforderungsbesprechung angefragt werden."
      : "A live video view of the manufacturing environment can be requested during the requirement discussion.";
  }

  if (/(category|categories|range|products|kollektion|kollektionen|produkte)/i.test(q)) {
    return de
      ? "Unsere fünf Hauptkategorien sind: Bavarian & Trachten Wear, Premium Leather Apparel, Sportswear, Streetwear & Activewear sowie Leisure & Nightwear."
      : "Our five main categories are Bavarian & Trachten Wear, Premium Leather Apparel, Sportswear, Streetwear & Activewear, and Leisure & Nightwear.";
  }

  return de
    ? "Ich kann Ihnen zu Produkten, Kategorien, Mustern, Private Label und dem Fertigungsprozess helfen. Für eine genaue Prüfung öffnen Sie die Produkte oder senden Sie eine Anfrage."
    : "I can help with products, categories, sampling, private label and the manufacturing process. For an exact review, browse the products or send an inquiry.";
}

export default function LiveChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<GuideMode>("ai");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef<string>("");

  if (!sessionIdRef.current) {
    try {
      let s = sessionStorage.getItem("irha:chat-sid");
      if (!s) {
        s = crypto.randomUUID();
        sessionStorage.setItem("irha:chat-sid", s);
      }
      sessionIdRef.current = s;
    } catch {
      sessionIdRef.current = crypto.randomUUID();
    }
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 639px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const logAssistant = (content: string) => {
    void supabase.from("chat_messages").insert({
      session_id: sessionIdRef.current,
      role: "assistant",
      message: content,
    });
  };

  const useBackup = (next: Msg[], userText: string) => {
    const reply = fallbackReply(userText);
    setMode("backup");
    setMessages([...next, { role: "assistant", content: reply }]);
    logAssistant(reply);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    void supabase.from("chat_messages").insert({
      session_id: sessionIdRef.current,
      role: "user",
      message: userMsg.content,
    });

    if (mode === "backup") {
      useBackup(next, userMsg.content);
      setLoading(false);
      return;
    }

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

      if (!res.ok || !res.body) throw new Error("guide-unavailable");

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
          const valueLine = line.trim();
          if (!valueLine.startsWith("data:")) continue;
          const data = valueLine.slice(5).trim();
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
            // Ignore streaming keepalives.
          }
        }
      }

      if (!acc) {
        useBackup(next, userMsg.content);
      } else {
        logAssistant(acc);
      }
    } catch {
      useBackup(next, userMsg.content);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Irha Guide"
          className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6 z-[60] group flex items-center gap-2 bg-gradient-gold text-primary-foreground rounded-full pl-3 pr-4 py-3 shadow-gold hover:scale-105 transition-transform"
        >
          <Sparkles size={20} />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] hidden sm:inline">Irha Guide</span>
        </button>
      )}

      {open && (
        <div className="fixed z-[80] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:inset-auto sm:right-6 sm:bottom-6 sm:w-[400px] sm:h-[min(680px,calc(100vh-3rem))] flex flex-col bg-background border border-border shadow-elegant rounded-sm overflow-hidden animate-fade-in">
          <div className="shrink-0 bg-gradient-to-r from-card to-background border-b border-border/60 px-3 py-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                  <Sparkles size={15} className="text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base leading-tight">Irha Guide</p>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-foreground/55 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Online · {mode === "backup" ? "Smart backup" : "Smart guide"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Chat on WhatsApp"
                  className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] bg-[#25D366] text-white px-2.5 py-2 rounded-full"
                >
                  <MessageCircle size={12} /> <span className="hidden xs:inline">WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Irha Guide"
                  className="w-9 h-9 inline-flex items-center justify-center border border-border/60 text-foreground/70 hover:text-foreground hover:border-gold transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-background overscroll-contain">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap rounded-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border/60 text-foreground/90"}`}>
                  {m.content || (loading && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse [animation-delay:0.4s]" />
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="pt-1 space-y-2">
                <p className="text-[9px] uppercase tracking-[0.22em] text-foreground/50">Quick questions</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-[11px] px-3 py-1.5 border border-border/60 hover:border-primary hover:text-primary transition-colors rounded-sm">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "backup" && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Link to="/products" onClick={() => setOpen(false)} className="text-center text-[9px] uppercase tracking-[0.15em] border border-border/60 px-2 py-2.5 hover:border-gold hover:text-gold">Products</Link>
                <Link to="/inquiry?intent=rfq" onClick={() => setOpen(false)} className="text-center text-[9px] uppercase tracking-[0.15em] border border-gold/60 text-gold px-2 py-2.5">Get Quote</Link>
                <a href={whatsappLink()} target="_blank" rel="noreferrer noopener" className="text-center text-[9px] uppercase tracking-[0.15em] border border-[#25D366]/60 text-[#25D366] px-2 py-2.5">WhatsApp</a>
              </div>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="shrink-0 border-t border-border/60 p-3 bg-card">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                placeholder="Ask about products or manufacturing… (EN / DE)"
                disabled={loading}
                className="min-w-0 flex-1 resize-none bg-background border border-border/60 focus:border-primary outline-none text-sm px-3 py-2.5 rounded-sm max-h-24"
              />
              <button type="submit" disabled={loading || !input.trim()} aria-label="Send" className="shrink-0 bg-gradient-gold text-primary-foreground p-2.5 rounded-sm disabled:opacity-40 hover:shadow-gold transition-all">
                <Send size={16} />
              </button>
            </div>
            <p className="text-[8px] uppercase tracking-[0.16em] text-foreground/40 mt-2 text-center">
              Guide answers are non-binding · Final details confirmed after review
            </p>
          </form>
        </div>
      )}
    </>
  );
}
