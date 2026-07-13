import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileCheck2, Tags, Video } from "lucide-react";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";

const POINTS = [
  {
    icon: FileCheck2,
    title: "Requirement-led development",
    text: "The product brief, materials, construction, decoration and destination are reviewed before quotation.",
  },
  {
    icon: CheckCircle2,
    title: "Approval before bulk",
    text: "Specifications, references, samples and requested changes are reviewed before a bulk commitment.",
  },
  {
    icon: Tags,
    title: "Private-label execution",
    text: "Woven labels, care labels, hangtags, packaging and branding can be scoped for the order.",
  },
  {
    icon: Video,
    title: "Buyer verification",
    text: "A scheduled live factory video call is available for buyers who want additional confidence.",
  },
];

export default function HomeManufacturingEditorial() {
  return (
    <section className="bg-[#122033] py-20 text-white md:py-24">
      <div className="container-luxe grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-6">
          <div className="relative overflow-hidden border border-white/15 bg-[#0c1725] p-3 shadow-[0_26px_80px_rgba(0,0,0,.28)]">
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#091321]/80 via-transparent to-transparent" />
              <div className="absolute inset-x-5 bottom-5 border border-white/20 bg-[#122033]/90 p-5 backdrop-blur-sm">
                <p className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#d9b765]">Factory verification</p>
                <p className="mt-2 font-display text-2xl">Experienced manufacturer. Newly built website.</p>
                <p className="mt-2 text-xs leading-6 text-white/65">
                  Buyers can request a live video call to discuss the program and view relevant factory areas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#d9b765]">Why B2B buyers work with us</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.04] md:text-5xl lg:text-6xl">
            Clear requirements. Documented approvals. Practical communication.
          </h2>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/68 md:text-base">
            Irha Apparels manufactures custom apparel programs in Sialkot for brands, wholesalers and importers. Commercial terms are confirmed against the actual style, quantity, customization and destination.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="border border-white/12 bg-white/[0.04] p-5">
                <Icon size={18} className="text-[#d9b765]" strokeWidth={1.6} />
                <h3 className="mt-4 font-sans text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-white/58">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/manufacturing"
              className="inline-flex min-h-12 items-center gap-3 bg-[#d1ad59] px-6 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#122033] transition-colors hover:bg-[#e0c275]"
            >
              View manufacturing <ArrowRight size={13} />
            </Link>
            <Link
              to="/factory-video-call"
              className="inline-flex min-h-12 items-center gap-2 border border-white/25 px-6 text-[9px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-[#d9b765] hover:text-[#d9b765]"
            >
              <Video size={13} /> Request factory call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
