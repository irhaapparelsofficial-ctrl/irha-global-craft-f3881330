import { ClipboardCheck, Layers, Tag, Video } from "lucide-react";

const ITEMS = [
  {
    Icon: Layers,
    title: "OEM & ODM Manufacturing",
    text: "Programs developed from a brief, tech pack, sample or reference.",
  },
  {
    Icon: Tag,
    title: "Private Label Ready",
    text: "Labels, tags, packaging and branding reviewed per order.",
  },
  {
    Icon: ClipboardCheck,
    title: "Requirement-Led Quote",
    text: "MOQ, timeline and pricing confirmed for the exact program.",
  },
  {
    Icon: Video,
    title: "Live Factory View",
    text: "Buyers can request a scheduled factory video call.",
  },
];

export default function CapabilityStrip() {
  return (
    <section aria-label="Core B2B capabilities" className="border-b border-border/60 bg-card/45">
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
