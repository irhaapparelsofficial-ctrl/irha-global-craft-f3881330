import { FileText, PackageCheck, Tags, Video } from "lucide-react";

const ITEMS = [
  {
    Icon: FileText,
    number: "01",
    title: "Buyer brief",
    text: "Product, quantity and destination requirements reviewed per program",
  },
  {
    Icon: Tags,
    number: "02",
    title: "Private label",
    text: "Labels, tags, branding and packaging scoped to the order",
  },
  {
    Icon: Video,
    number: "03",
    title: "Live verification",
    text: "Factory view available through a scheduled video call",
  },
  {
    Icon: PackageCheck,
    number: "04",
    title: "Order confirmation",
    text: "Commercial and documentation details confirmed before commitment",
  },
];

export default function CapabilityStrip() {
  return (
    <section aria-label="Buyer program workflow" className="border-b border-border/60 bg-background">
      <div className="container-luxe py-0">
        <div className="grid border-x border-border/50 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ Icon, number, title, text }, index) => (
            <div
              key={title}
              className={`group relative min-h-[150px] p-5 transition-colors hover:bg-card/55 md:p-6 ${
                index > 0 ? "border-t border-border/50 sm:border-t-0 sm:border-l" : ""
              } ${index === 2 ? "sm:border-t lg:border-t-0" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <Icon size={19} className="text-gold" strokeWidth={1.5} />
                <span className="font-mono text-[9px] tracking-[0.24em] text-muted-foreground">{number}</span>
              </div>
              <h2 className="mt-5 font-display text-lg leading-tight md:text-xl">{title}</h2>
              <p className="mt-2 max-w-[250px] text-[11px] leading-5 text-foreground/58">{text}</p>
              <span className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100 md:inset-x-6" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
