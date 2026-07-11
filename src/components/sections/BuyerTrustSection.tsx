import { Link } from "react-router-dom";
import { ArrowRight, FileCheck2, RotateCcw, ShieldCheck, Video, Workflow } from "lucide-react";

const ITEMS = [
  {
    icon: Video,
    title: "Live factory view",
    text: "Request a scheduled video call to discuss the program and view relevant factory areas live.",
  },
  {
    icon: FileCheck2,
    title: "Requirement-led quote",
    text: "MOQ, pricing, timing and shipping are confirmed for the exact style, quantity and destination.",
  },
  {
    icon: Workflow,
    title: "Approval checkpoints",
    text: "Specifications, references, samples and requested changes are reviewed before bulk commitment.",
  },
  {
    icon: ShieldCheck,
    title: "Truthful documentation",
    text: "Material, testing and export documents are confirmed per program instead of claimed universally.",
  },
];

export default function BuyerTrustSection() {
  return (
    <section className="py-20 md:py-28 border-y border-border/60 bg-secondary/30">
      <div className="container-luxe">
        <div className="grid lg:grid-cols-12 gap-10 items-end mb-12">
          <div className="lg:col-span-8">
            <p className="eyebrow mb-4">Buyer verification</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.04] max-w-4xl">
              Do not rely on a website alone. <span className="text-gold italic">Verify the program.</span>
            </h2>
            <p className="text-sm md:text-base text-foreground/68 mt-5 max-w-3xl leading-relaxed">
              Irha Apparels is an experienced manufacturer and the website is newly built. Buyers can use a live factory call, detailed requirements and documented approvals to evaluate the relationship before ordering.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end gap-3 flex-wrap">
            <Link to="/buyer-trust" className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3.5 text-[10px] uppercase tracking-[0.22em]">
              Trust Center <ArrowRight size={13} />
            </Link>
            <Link to="/factory-video-call" className="inline-flex items-center gap-2 border border-foreground/25 hover:border-gold hover:text-gold px-6 py-3.5 text-[10px] uppercase tracking-[0.22em]">
              Factory Call
            </Link>
            <Link to="/repeat-order" className="inline-flex items-center gap-2 border border-foreground/25 hover:border-gold hover:text-gold px-6 py-3.5 text-[10px] uppercase tracking-[0.22em]">
              <RotateCcw size={13} /> Repeat Order
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60">
          {ITEMS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="bg-background p-6 md:p-7">
              <Icon className="text-gold" size={22} />
              <h3 className="font-display text-xl mt-5">{title}</h3>
              <p className="text-sm text-foreground/62 leading-relaxed mt-3">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
