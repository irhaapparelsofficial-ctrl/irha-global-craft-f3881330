import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Video } from "lucide-react";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";

const POINTS = [
  "Product brief translated into material, construction and branding requirements",
  "Sample and requested changes reviewed before bulk commitment",
  "Scheduled live factory video call available for buyer verification",
];

export default function HomeManufacturingEditorial() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-[#090909] py-12 text-white md:py-18">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,hsl(var(--primary)/0.10),transparent_28%)]" />
      <div className="container-luxe relative grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-6">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/15 bg-black shadow-elegant sm:rounded-none">
            <img
              src={factoryCinematic}
              alt="Irha Apparels manufacturing environment in Sialkot"
              loading="lazy"
              decoding="async"
              width={1400}
              height={875}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 text-white">
              <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-primary sm:text-[8px]">Sialkot manufacturing partner</p>
              <p className="mt-1.5 max-w-lg font-display text-xl leading-tight sm:text-2xl">Factory view available by scheduled video call.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[10px]">Manufacturing proof</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
            Review the process behind the product.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/66 sm:leading-7">
            The factory discussion focuses on your actual product, quantity, customization and destination—not generic website promises.
          </p>

          <ul className="mt-4 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 rounded-lg border border-white/12 bg-white/[0.035] p-3 text-xs leading-5 text-white/68 sm:rounded-none lg:p-3.5">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.7} />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            <Link
              to="/manufacturing"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-gradient-gold px-4 text-[8px] font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-all hover:shadow-gold sm:px-5 sm:text-[9px]"
            >
              Manufacturing <ArrowRight size={13} />
            </Link>
            <Link
              to="/factory-video-call"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/25 px-4 text-[8px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:border-primary hover:text-primary sm:px-5 sm:text-[9px]"
            >
              <Video size={13} /> Factory call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
