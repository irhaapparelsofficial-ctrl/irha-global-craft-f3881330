import { Link } from "react-router-dom";
import { ArrowRight, Eye, PackageCheck, Scissors, Tags, Video } from "lucide-react";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";
import { useHomepageMedia } from "@/hooks/useHomepageMedia";

const VERIFY = [
  { Icon: Eye, title: "Live factory view", text: "A scheduled video call can show the working environment and discuss the buyer’s actual requirement." },
  { Icon: Scissors, title: "Sample & construction", text: "Materials, measurements, construction details and requested revisions are reviewed before bulk commitment." },
  { Icon: Tags, title: "Branding scope", text: "Embroidery, printing, woven labels, care labels, hangtags and packaging are confirmed per product." },
  { Icon: PackageCheck, title: "Packing & dispatch", text: "Packing, documentation, destination and shipping arrangement are checked against the approved order." },
];

export default function HomeManufacturingEditorial() {
  const { data: approvedMedia = {} } = useHomepageMedia();
  const privateLabelVisual = approvedMedia.private_label_visual || approvedMedia.private_label || factoryCinematic;

  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-[#090909] py-12 text-white md:py-18">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,hsl(var(--primary)/0.10),transparent_28%)]" />
      <div className="container-luxe relative grid gap-7 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-5">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/15 bg-black shadow-elegant sm:rounded-none">
            <img src={privateLabelVisual} alt="Private-label apparel branding, labels and packaging options" loading="lazy" decoding="async" width={1400} height={875} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/15 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 text-white">
              <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-primary sm:text-[8px]">Private-label manufacturing</p>
              <p className="mt-1.5 max-w-lg font-display text-xl leading-tight sm:text-2xl">Branding, labels and packaging reviewed before bulk production.</p>
              <p className="mt-2 max-w-md text-[10px] leading-5 text-white/62 sm:text-xs">The buyer’s approved specification controls artwork placement, trims, woven labels, care labels, hangtags and packing.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[10px]">Manufacturing proof</p>
          <h2 className="mt-2 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">See what can be verified before bulk production.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/66 sm:leading-7">A professional B2B order should move forward on an approved specification, not broad promises. These are the checkpoints buyers can discuss and verify.</p>
          <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-white/12 bg-white/12 sm:grid-cols-2 sm:rounded-none">
            {VERIFY.map(({ Icon, title, text }) => (
              <article key={title} className="bg-[#0c0c0c] p-4 sm:p-5">
                <Icon size={18} className="text-primary" strokeWidth={1.6} />
                <h3 className="mt-3 font-sans text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-white/60">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            <Link to="/manufacturing" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-gradient-gold px-4 text-[8px] font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-all hover:shadow-gold sm:px-5 sm:text-[9px]">Manufacturing process <ArrowRight size={13} /></Link>
            <Link to="/factory-video-call" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/25 px-4 text-[8px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:border-primary hover:text-primary sm:px-5 sm:text-[9px]"><Video size={13} /> Request factory call</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
