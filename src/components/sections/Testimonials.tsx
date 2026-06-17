import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";

const QUOTES = [
  {
    quote:
      "Irha's lederhosen program is the cleanest construction we've sourced from South Asia. Embroidery, leather grade, fit — all on par with our German makers, at a fraction of the lead time.",
    name: "Lukas Hofmann",
    role: "Head of Sourcing",
    company: "Trachten House · Munich, DE",
  },
  {
    quote:
      "We migrated our entire silk pajama program to Irha last season. Every shipment lands ready for the floor — no rework, no shade variance.",
    name: "Amanda Reyes",
    role: "Production Director",
    company: "Heirloom Sleepwear · New York, USA",
  },
  {
    quote:
      "Their leather division is exceptional. The biker jackets we developed compete directly with our Italian suppliers — buyers can't tell the difference.",
    name: "James Whitaker",
    role: "Creative Director",
    company: "London Lane Atelier · UK",
  },
  {
    quote:
      "From tech pack to first sample in 9 days. The communication, the precision — Irha has become our default for sportswear development.",
    name: "Marco Conti",
    role: "Founder",
    company: "Aurora Sport · Milan, IT",
  },
  {
    quote:
      "We run a tight retail program in the Gulf. Irha understands deadlines, packaging standards and the level of finish our customers expect.",
    name: "Khalid Al-Mansoori",
    role: "Procurement Manager",
    company: "Dune Atelier · Dubai, UAE",
  },
  {
    quote:
      "As an emerging label, finding a factory that takes us seriously at low MOQs was hard — until Irha. They scaled with us from 50 units to 5,000.",
    name: "Sophie Brennan",
    role: "Co-Founder",
    company: "Pacific North Streetwear · Vancouver, CA",
  },
];

export default function Testimonials() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % QUOTES.length), 7000);
    return () => clearInterval(id);
  }, []);

  const q = QUOTES[i];

  return (
    <section className="py-24 md:py-36 bg-background">
      <div className="container-luxe">
        <p className="eyebrow mb-6">Buyer Notes</p>
        <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-3xl mb-16">
          What our partners <span className="text-gold italic">say.</span>
        </h2>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 relative">
            <Quote className="text-primary/40 absolute -top-4 -left-2" size={64} strokeWidth={1} />
            <blockquote
              key={i}
              className="font-display text-2xl md:text-3xl lg:text-4xl leading-[1.25] text-foreground/90 pl-10 md:pl-16 animate-fade-in min-h-[200px]"
            >
              "{q.quote}"
            </blockquote>
            <div className="pl-10 md:pl-16 mt-10 border-t border-border/60 pt-6">
              <p className="font-display text-xl">{q.name}</p>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-1">
                {q.role} · {q.company}
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 flex lg:flex-col gap-3 lg:gap-2">
            <div className="flex gap-2 lg:order-2">
              <button
                onClick={() => setI((x) => (x - 1 + QUOTES.length) % QUOTES.length)}
                aria-label="Previous"
                className="w-12 h-12 border border-border/60 hover:border-primary hover:text-primary flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => setI((x) => (x + 1) % QUOTES.length)}
                aria-label="Next"
                className="w-12 h-12 border border-border/60 hover:border-primary hover:text-primary flex items-center justify-center transition-colors"
              >
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="hidden lg:flex flex-col gap-2 mt-6">
              {QUOTES.map((qq, idx) => (
                <button
                  key={qq.name}
                  onClick={() => setI(idx)}
                  className={`text-left text-[11px] uppercase tracking-[0.25em] py-2 border-l-2 pl-4 transition-all ${
                    i === idx ? "border-primary text-primary" : "border-border/60 text-foreground/50 hover:text-foreground"
                  }`}
                >
                  {qq.company}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
