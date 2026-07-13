import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, FileText, MessageCircle, Upload } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

const REQUIREMENTS = ["Product or reference", "Approximate quantity", "Delivery destination"];

export default function StartProgramCTA() {
  return (
    <section className="border-t border-border/60 bg-card/35 py-16 text-foreground md:py-20">
      <div className="container-luxe">
        <div className="relative grid gap-8 overflow-hidden border border-primary/25 bg-[#090909] px-6 py-8 text-white md:px-9 md:py-10 lg:grid-cols-12 lg:items-center lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_10%,hsl(var(--primary)/0.14),transparent_30%)]" />
          <div className="relative lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Start a B2B program</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
              Send the product, quantity and destination for a scoped response.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
              Pricing is prepared per order using material, construction, customization, branding, packaging and shipping requirements. No public retail pricing is used.
            </p>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/70">
              {REQUIREMENTS.map((requirement) => (
                <span key={requirement} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-primary" /> {requirement}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/65">
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
