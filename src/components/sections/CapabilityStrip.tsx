import { ClipboardCheck, Factory, PackageCheck, Tags } from "lucide-react";

const ITEMS = [
  { Icon: Factory, title: "OEM, ODM & Private Label", text: "Made-to-order manufacturing for brands, wholesalers and importers." },
  { Icon: ClipboardCheck, title: "Sample Before Bulk", text: "Construction, branding and requested changes are aligned before commitment." },
  { Icon: Tags, title: "Custom Branding", text: "Printing, embroidery, labels, hangtags and packaging are scoped per product." },
  { Icon: PackageCheck, title: "Export Order Review", text: "Quantity, destination, packing and shipping requirements are reviewed per order." },
];

export default function CapabilityStrip() {
  return (
    <section aria-label="Core B2B manufacturing capabilities" className="border-b border-border/60 bg-card/45 py-4 sm:py-0">
      <div className="container-luxe">
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-px sm:bg-border/60 sm:px-0 lg:grid-cols-4">
          {ITEMS.map(({ Icon, title, text }) => (
            <article key={title} className="flex min-w-[82%] snap-start gap-3.5 rounded-xl border border-border/70 bg-background p-4 sm:min-w-0 sm:rounded-none sm:border-0 sm:px-5 sm:py-6 md:px-6 md:py-7">
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
      </div>
    </section>
  );
}
