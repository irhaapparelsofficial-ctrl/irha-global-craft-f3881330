import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, FileText, MessageCircle, Upload } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

const REQUIREMENTS = ["Product or reference", "Approximate quantity", "Delivery destination"];

export default function StartProgramCTA() {
  return (
    <section className="border-t border-border/60 bg-card/35 py-20 text-foreground md:py-24">
      <div className="container-luxe">
        <div className="relative grid gap-10 overflow-hidden border border-primary/25 bg-[#090909] px-7 py-10 text-white md:px-10 md:py-12 lg:grid-cols-12 lg:items-center lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_10%,hsl(var(--primary)/0.14),transparent_30%)]" />
          <div className="relative lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Start a B2B program</p>
            <h2 className="mt-4 max-w-4xl font-display text-4xl leading-[1.04] md:text-5xl lg:text-6xl">
              Send the product, quantity and destination for a scoped response.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
              Pricing is prepared per order using material, construction, customization, branding, packaging and shipping requirements. No public retail pricing is used.
            </p>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/70">
              {REQUIREMENTS.map((requirement) => (
                <span key={requirement} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-primary" /> {requirement}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/65">
              <Link to="/inquiry?intent=reference" className="inline-flex items-center gap-2 hover:text-primary">
                <Upload size={13} /> Upload reference
              </Link>
              <Link to="/inquiry?intent=catalogue" className="inline-flex items-center gap-2 hover:text-primary">
                <BookOpen size={13} /> Request catalogue
              </Link>
            </div>
          </div>

          <div className="relative flex flex-col gap-3 lg:col-span-4">
            <Link
              to="/inquiry?intent=rfq"
              className="inline-flex min-h-[52px] items-center justify-center gap-3 bg-gradient-gold px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-all hover:shadow-gold"
            >
              <FileText size={14} /> Request a quote <ArrowRight size={14} />
            </Link>
            <a
              href={whatsappLink("Hi, I'd like to discuss a B2B apparel manufacturing program. I can share the product, approximate quantity and destination.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center gap-3 border border-white/25 px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-primary hover:text-primary"
            >
              <MessageCircle size={14} /> Discuss on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
