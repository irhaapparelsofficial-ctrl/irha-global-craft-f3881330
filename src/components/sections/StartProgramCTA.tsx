import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, FileText, Headphones, MessageCircle, Upload } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

const REQUIREMENTS = ["Product or reference", "Approximate quantity", "Delivery destination"];

export default function StartProgramCTA() {
  const openLiveChat = () => window.dispatchEvent(new CustomEvent("irha:open-human-chat"));

  return (
    <section className="border-t border-border/60 bg-card/35 py-14 text-foreground md:py-18">
      <div className="container-luxe">
        <div className="relative grid gap-7 overflow-hidden rounded-2xl border border-primary/25 bg-[#090909] px-5 py-7 text-white sm:rounded-none sm:px-8 sm:py-9 lg:grid-cols-12 lg:items-center lg:px-11 lg:py-11">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_10%,hsl(var(--primary)/0.14),transparent_30%)]" />
          <div className="relative lg:col-span-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[10px]">Start your manufacturing request</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
              Send the product, quantity and destination for a scoped response.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65">
              Material, construction, customization, branding, packaging and shipping requirements are reviewed before a quotation is prepared.
            </p>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/70 sm:text-[9px]">
              {REQUIREMENTS.map((requirement) => (
                <span key={requirement} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-primary" /> {requirement}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/58">
              <Link to="/inquiry?intent=reference" className="inline-flex min-h-9 items-center gap-2 hover:text-primary">
                <Upload size={13} /> Upload reference
              </Link>
              <Link to="/inquiry?intent=catalogue" className="inline-flex min-h-9 items-center gap-2 hover:text-primary">
                <BookOpen size={13} /> Request catalogue
              </Link>
            </div>
          </div>

          <div className="relative flex flex-col gap-2.5 lg:col-span-4">
            <Link
              to="/inquiry?intent=rfq"
              className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-md bg-gradient-gold px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold"
            >
              <FileText size={14} /> Request a quote <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onClick={openLiveChat}
              className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-md border border-white/25 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-emerald-400 hover:text-emerald-300"
            >
              <Headphones size={14} /> Chat with Irha team
            </button>
            <a
              href={whatsappLink("Hi, I'd like to discuss a B2B apparel manufacturing program. I can share the product, approximate quantity and destination.")}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-9 items-center justify-center gap-2 text-[9px] font-medium text-white/48 transition-colors hover:text-emerald-300"
            >
              <MessageCircle size={13} /> WhatsApp fallback
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
