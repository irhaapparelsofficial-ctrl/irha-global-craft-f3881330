import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  PackageCheck,
  Scissors,
  Tags,
  Video,
} from "lucide-react";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";
import manufacturingImg from "@/assets/manufacturing.jpg";

const POINTS = [
  {
    icon: Scissors,
    title: "Requirement-led development",
    text: "Programs are reviewed around the buyer brief, references, materials, construction and intended use.",
  },
  {
    icon: Tags,
    title: "Private-label finishing",
    text: "Labels, tags, packaging and branding requirements can be scoped as part of the product program.",
  },
  {
    icon: BadgeCheck,
    title: "Approval checkpoints",
    text: "Specifications, samples and requested changes are reviewed before a bulk commitment is confirmed.",
  },
  {
    icon: PackageCheck,
    title: "Order-specific documentation",
    text: "Material, testing, packing and destination requirements are confirmed for the actual order.",
  },
];

export default function HomeManufacturingEditorial() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#0a0a0a] py-20 text-white md:py-28 lg:py-32">
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:54px_54px]" />
      <div className="pointer-events-none absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-gold/10 blur-[130px]" />

      <div className="container-luxe relative">
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="relative min-h-[560px] md:min-h-[650px]">
              <div className="absolute left-0 top-0 h-[72%] w-[78%] overflow-hidden border border-white/14 bg-black shadow-[0_40px_100px_rgba(0,0,0,.55)]">
                <img
                  src={factoryCinematic}
                  alt="Irha Apparels manufacturing environment in Sialkot"
                  loading="lazy"
                  decoding="async"
                  width={1400}
                  height={1000}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />
                <div className="absolute left-5 top-5 border border-gold/35 bg-black/75 px-4 py-3 text-[8px] uppercase tracking-[0.25em] text-gold backdrop-blur-sm">
                  Manufacturing environment
                </div>
              </div>

              <div className="absolute bottom-0 right-0 h-[58%] w-[60%] overflow-hidden border-[10px] border-[#0a0a0a] bg-black shadow-[0_35px_90px_rgba(0,0,0,.6)] md:border-[14px]">
                <img
                  src={manufacturingImg}
                  alt="Apparel manufacturing work at Irha Apparels"
                  loading="lazy"
                  decoding="async"
                  width={1100}
                  height={900}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <p className="absolute inset-x-5 bottom-5 text-[9px] uppercase tracking-[0.22em] text-white/72">
                  Buyer requirements translated into production instructions
                </p>
              </div>

              <div className="absolute bottom-[8%] left-[3%] hidden w-44 border border-gold/30 bg-black/88 p-5 backdrop-blur md:block">
                <Video size={18} className="text-gold" />
                <p className="mt-4 font-display text-lg leading-tight">Verify through a live factory call.</p>
                <Link
                  to="/factory-video-call"
                  className="mt-4 inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.22em] text-gold"
                >
                  Request a call <ArrowUpRight size={11} />
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mb-7 flex flex-wrap gap-2 text-[8px] uppercase tracking-[0.22em] text-white/65">
              <span className="border border-gold/35 px-3 py-2 text-gold">Experienced manufacturer</span>
              <span className="border border-white/15 px-3 py-2">Newly built website</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-gold">Inside the manufacturing relationship</p>
            <h2 className="mt-5 font-display text-4xl leading-[0.98] tracking-[-0.025em] md:text-6xl">
              A website can introduce us. <span className="block italic text-gold">Your program proves the fit.</span>
            </h2>
            <p className="mt-7 text-sm leading-7 text-white/68 md:text-base md:leading-8">
              Irha Apparels works as a B2B apparel manufacturer in Sialkot. Buyers can review the product range online, share a clear brief, request a live factory view and confirm commercial details against the exact order instead of relying on broad website claims.
            </p>

            <div className="mt-9 grid gap-px border border-white/12 bg-white/12 sm:grid-cols-2">
              {POINTS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="bg-[#0a0a0a] p-5 md:p-6">
                  <Icon size={18} className="text-gold" strokeWidth={1.5} />
                  <h3 className="mt-4 font-display text-lg leading-tight text-white">{title}</h3>
                  <p className="mt-3 text-xs leading-6 text-white/58">{text}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/manufacturing"
                className="group inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-6 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-all hover:shadow-gold"
              >
                Explore manufacturing <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/factory-video-call"
                className="inline-flex min-h-12 items-center gap-2 border border-white/22 px-6 text-[9px] uppercase tracking-[0.22em] text-white transition-colors hover:border-gold hover:text-gold"
              >
                <Video size={13} /> Factory video call
              </Link>
              <Link
                to="/inquiry?intent=rfq"
                className="inline-flex min-h-12 items-center border border-white/22 px-6 text-[9px] uppercase tracking-[0.22em] text-white transition-colors hover:border-gold hover:text-gold"
              >
                Send buyer brief
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
