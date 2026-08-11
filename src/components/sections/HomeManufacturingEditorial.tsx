import { Link } from "react-router-dom";
import { ArrowRight, Eye, FileCheck2, PackageCheck, Scissors, Tags, Video } from "lucide-react";
import { FactoryCapabilityPosterLink } from "@/components/factory/FactoryCapabilityMedia";

const VERIFY = [
  { Icon: Eye, title: "Live factory view by request", text: "A buyer can request an appointment-based live call. Availability and viewing scope are confirmed after the requirement is reviewed." },
  { Icon: Scissors, title: "Sample and construction review", text: "Materials, measurements, construction details and requested revisions are discussed before a bulk commitment." },
  { Icon: Tags, title: "Branding scope", text: "Artwork placement, labels, trims and packaging are confirmed against the buyer-approved specification." },
  { Icon: PackageCheck, title: "Packing and dispatch review", text: "Packing, documentation, destination and shipping responsibilities are confirmed for the approved order." },
];

export default function HomeManufacturingEditorial() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-[#090909] py-14 text-white md:py-20" aria-labelledby="buyer-verification-title">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,hsl(var(--primary)/0.10),transparent_28%)]" />
      <div className="container-luxe relative grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <FileCheck2 size={26} className="text-primary" />
          <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[10px]">Buyer verification</p>
          <h2 id="buyer-verification-title" className="mt-3 font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
            See what can be verified before bulk production.
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/66">
            A professional B2B order should move forward on a reviewed brief, written specification and documented approvals—not broad website claims.
          </p>
          <p className="mt-3 text-xs leading-5 text-white/50">
            A real prerecorded factory capability overview is available. Appointment-based live factory verification remains a separate option for qualified buyers.
          </p>
        </div>

        <div className="lg:col-span-8">
          <FactoryCapabilityPosterLink className="mb-5 border-white/12" label="Play real factory video" />
          <div className="grid gap-px overflow-hidden rounded-xl border border-white/12 bg-white/12 sm:grid-cols-2 sm:rounded-none">
            {VERIFY.map(({ Icon, title, text }) => (
              <article key={title} className="bg-[#0c0c0c] p-5 sm:p-6">
                <Icon size={18} className="text-primary" strokeWidth={1.6} />
                <h3 className="mt-3 font-sans text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-white/60">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            <Link to="/manufacturing" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-gradient-gold px-4 text-[8px] font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-all hover:shadow-gold sm:px-5 sm:text-[9px]">
              Manufacturing process <ArrowRight size={13} />
            </Link>
            <Link to="/factory-video-call" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/25 px-4 text-[8px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:border-primary hover:text-primary sm:px-5 sm:text-[9px]">
              <Video size={13} /> Request factory call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
