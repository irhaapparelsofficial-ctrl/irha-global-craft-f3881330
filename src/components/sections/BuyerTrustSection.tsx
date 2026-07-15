import { Link } from "react-router-dom";
import { ArrowRight, FileCheck2, ShieldCheck, Tags, Workflow } from "lucide-react";

const ITEMS = [
  {
    icon: FileCheck2,
    title: "Commercial scope",
    text: "MOQ, price, sample route, timing and shipping terms are confirmed for the exact style, quantity and destination.",
  },
  {
    icon: Workflow,
    title: "Approval checkpoints",
    text: "Sample, revisions, material, measurements and branding are aligned before a bulk production commitment.",
  },
  {
    icon: Tags,
    title: "Private-label scope",
    text: "Woven labels, care labels, hangtags, embroidery, printing and packaging are reviewed per product.",
  },
  {
    icon: ShieldCheck,
    title: "Factory verification",
    text: "Buyers can request a scheduled live video view of the manufacturing environment during requirement review.",
  },
];

export default function BuyerTrustSection() {
  return (
    <section className="border-y border-border/60 bg-card/35 py-14 md:py-18">
      <div className="container-luxe">
        <div className="mb-8 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">Buyer confidence</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
              Verify the program before you commit to bulk production.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/65 md:text-base">
              Serious B2B orders need clear specifications, approval checkpoints and commercial terms. Irha Apparels confirms these against the actual buyer brief instead of relying on broad website promises.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            <Link
              to="/buyer-trust"
              className="inline-flex min-h-11 items-center gap-2 bg-gradient-gold px-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold"
            >
              Buyer trust center <ArrowRight size={13} />
            </Link>
            <Link
              to="/factory-video-call"
              className="inline-flex min-h-11 items-center gap-2 border border-border/70 px-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Factory video call
            </Link>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-4 sm:rounded-none">
          {ITEMS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="bg-background p-5 md:p-6">
              <Icon className="text-primary" size={19} strokeWidth={1.6} />
              <h3 className="mt-4 font-sans text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-foreground/62">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
