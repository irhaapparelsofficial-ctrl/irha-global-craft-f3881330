import { ClipboardCheck, Factory, PackageCheck, Tags } from "lucide-react";

const ITEMS = [
  {
    Icon: Factory,
    title: "OEM, ODM & Private Label",
    text: "Made-to-order manufacturing for brands, wholesalers, importers and bulk retail programs.",
  },
  {
    Icon: ClipboardCheck,
    title: "Sample Before Bulk",
    text: "Materials, construction, branding and requested changes are aligned before production commitment.",
  },
  {
    Icon: Tags,
    title: "Custom Branding",
    text: "Embroidery, printing, woven labels, care labels, hangtags and packaging are scoped per product.",
  },
  {
    Icon: PackageCheck,
    title: "Export Order Review",
    text: "Quantity, destination, packing, documentation and shipping requirements are confirmed per order.",
  },
];

export default function CapabilityStrip() {
  return (
    <section aria-label="Core B2B manufacturing capabilities" className="border-b border-border/60 bg-card/45">
      <div className="container-luxe grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ Icon, title, text }) => (
          <article key={title} className="flex gap-3.5 bg-background px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-7">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/8 text-primary sm:rounded-none">
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
