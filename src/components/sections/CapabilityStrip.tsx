import { ClipboardCheck, Layers, PackageCheck, Tags } from "lucide-react";

const ITEMS = [
  {
    Icon: Layers,
    title: "Product Development",
    text: "Briefs, tech packs, samples and references are reviewed before quotation.",
  },
  {
    Icon: ClipboardCheck,
    title: "Sampling & Approvals",
    text: "Materials, construction and requested changes are aligned before bulk.",
  },
  {
    Icon: Tags,
    title: "Private Label & Packaging",
    text: "Branding, labels, tags and packing are scoped for the actual order.",
  },
  {
    Icon: PackageCheck,
    title: "Export Order Review",
    text: "Quantity, destination, documents and shipping needs are confirmed per program.",
  },
];

export default function CapabilityStrip() {
  return (
    <section aria-label="Core B2B buyer capabilities" className="border-b border-border/60 bg-card/45">
      <div className="container-luxe grid gap-px bg-border/60 md:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ Icon, title, text }) => (
          <article key={title} className="flex gap-4 bg-background px-5 py-6 md:px-6 md:py-7">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center border border-primary/30 bg-primary/8 text-primary">
              <Icon size={18} strokeWidth={1.6} />
            </span>
            <div>
              <h2 className="font-sans text-sm font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
