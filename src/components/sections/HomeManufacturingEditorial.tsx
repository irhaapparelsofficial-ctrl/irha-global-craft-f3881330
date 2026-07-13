import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Video } from "lucide-react";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";

const POINTS = [
  "Product briefs are translated into material, construction and branding requirements.",
  "Samples and requested changes are reviewed before a bulk production commitment.",
  "Buyers can request a scheduled live factory video call for additional verification.",
];

export default function HomeManufacturingEditorial() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-[#090909] py-20 text-white md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,hsl(var(--primary)/0.10),transparent_28%)]" />
      <div className="container-luxe relative grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-6">
          <div className="relative overflow-hidden border border-white/15 bg-black p-3 shadow-elegant">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={factoryCinematic}
                alt="Irha Apparels manufacturing environment in Sialkot"
                loading="lazy"
                decoding="async"
                width={1400}
                height={1050}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
              <div className="absolute inset-x-5 bottom-5 border border-white/20 bg-black/88 p-5 backdrop-blur-sm">
                <p className="text-[8px] font-semibold uppercase tracking-[0.24em] text-primary">Sialkot manufacturing partner</p>
                <p className="mt-2 font-display text-2xl">Factory view available by scheduled video call.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Manufacturing proof</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.04] md:text-5xl lg:text-6xl">
            Review how the program is handled, not only the finished product.
          </h2>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/68 md:text-base">
            Irha Apparels manufactures custom apparel in Sialkot for brands, wholesalers and importers. The factory discussion focuses on the actual product, quantity, customization and destination.
          </p>

          <ul className="mt-8 space-y-4 border-y border-white/12 py-6">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm leading-7 text-white/68">
                <CheckCircle2 size={17} className="mt-1 shrink-0 text-primary" strokeWidth={1.7} />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/manufacturing"
              className="inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-6 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-all hover:shadow-gold"
            >
              View manufacturing <ArrowRight size={13} />
            </Link>
            <Link
              to="/factory-video-call"
              className="inline-flex min-h-12 items-center gap-2 border border-white/25 px-6 text-[9px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-primary hover:text-primary"
            >
              <Video size={13} /> Request factory call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
