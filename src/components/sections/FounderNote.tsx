import { Link } from "react-router-dom";
import { ArrowUpRight, Quote } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

export default function FounderNote() {
  return (
    <section className="relative py-24 md:py-36 overflow-hidden bg-secondary/30 border-y border-border/60">
      <div className="absolute inset-0 grain" />
      <div className="container-luxe relative grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-6">A Note from the MD</p>
          <h2 className="font-display text-3xl md:text-4xl leading-[1.05]">
            Built the way <span className="text-gold italic">I'd want</span> to be supplied.
          </h2>
        </div>

        <div className="lg:col-span-8 relative">
          <Quote
            className="absolute -top-4 -left-2 text-primary/15"
            size={72}
            strokeWidth={1}
          />
          <div className="relative space-y-6 text-foreground/85 text-base md:text-lg leading-relaxed font-light">
            <p>
              For twelve years I've watched buyers from Berlin, London and New York fly into
              Sialkot, sit across from manufacturers, and leave with the same complaint —
              <em className="text-foreground"> beautiful samples, broken communication, late shipments.</em>
            </p>
            <p>
              We built Irha to be the supplier I'd actually want on my own brand: one WhatsApp
              to the decision-maker, costs broken down to the trim, a video before the container
              ships, and a date on the PO that we don't move.
            </p>
            <p>
              If you're scaling a label that can't afford a missed season — that's the only
              kind of partner we know how to be.
            </p>
          </div>

          <div className="mt-10 flex items-center gap-6 flex-wrap">
            <div>
              <p className="font-display text-xl">Irha Apparels</p>
              <p className="text-xs uppercase tracking-[0.28em] text-primary mt-1">
                Managing Director · Sialkot Atelier
              </p>
            </div>
            <div className="flex gap-3 ml-auto">
              <a
                href={whatsappLink("Hello — I'd like to speak with the MD directly about a wholesale program.")}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-6 py-3.5 text-[11px] uppercase tracking-[0.28em] font-medium hover:shadow-gold transition-all"
              >
                Speak to the MD
                <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 border border-foreground/25 hover:border-primary hover:text-primary px-6 py-3.5 text-[11px] uppercase tracking-[0.28em] font-medium transition-colors"
              >
                Our Story
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
