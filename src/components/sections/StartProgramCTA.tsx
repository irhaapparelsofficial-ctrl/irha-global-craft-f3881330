import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle, FileText, Upload, BookOpen } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

export default function StartProgramCTA() {
  return (
    <section className="relative py-24 md:py-32 border-t border-border/60 bg-background">
      <div className="container-luxe relative max-w-5xl mx-auto text-center">
        <p className="eyebrow justify-center inline-flex mb-6">Start Your Program</p>
        <h2 className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.04]">
          Start your next <span className="text-gold italic">production program</span>.
        </h2>
        <p className="mt-6 text-foreground/70 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Pricing is prepared per order — based on quantity, material, customization,
          branding, packaging and destination. Share your requirement and we&apos;ll respond with a scoped quote.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
          <Link
            to="/inquiry"
            className="group inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-4 text-[11px] uppercase tracking-[0.28em] font-medium hover:shadow-gold transition-all"
          >
            <FileText size={14} /> Request a Quote
            <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            to="/studio"
            className="inline-flex items-center justify-center gap-2 border border-foreground/25 hover:border-gold hover:text-gold px-6 py-4 text-[11px] uppercase tracking-[0.28em] font-medium transition-colors"
          >
            <Upload size={14} /> Upload Reference Design
          </Link>
          <Link
            to="/catalogue"
            className="inline-flex items-center justify-center gap-2 border border-foreground/25 hover:border-gold hover:text-gold px-6 py-4 text-[11px] uppercase tracking-[0.28em] font-medium transition-colors"
          >
            <BookOpen size={14} /> Request Catalogue
          </Link>
          <a
            href={whatsappLink("Hi, I'd like to discuss a production program.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-foreground/25 hover:border-gold hover:text-gold px-6 py-4 text-[11px] uppercase tracking-[0.28em] font-medium transition-colors"
          >
            <MessageCircle size={14} /> Ask on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
