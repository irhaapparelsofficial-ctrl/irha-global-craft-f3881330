import { FileText, MessagesSquare, Video, Lock, Clock, Receipt } from "lucide-react";

const PROMISES = [
  {
    Icon: Receipt,
    t: "Transparent, line-item pricing",
    d: "Costs broken down by fabric, trims, labour, finishing and branding — so you know what's driving the FOB.",
  },
  {
    Icon: MessagesSquare,
    t: "Direct line to the decision-maker",
    d: "Every wholesale account is handled personally — one WhatsApp, one point of accountability, no middle layer.",
  },
  {
    Icon: Video,
    t: "Pre-shipment inspection reporting",
    d: "Before the container ships, you can receive photo or video reporting of cartons, labels and finished units on request.",
  },
  {
    Icon: Clock,
    t: "Lead times confirmed on the PO",
    d: "Sample and bulk timelines are quoted and locked to the PO — no vague brochure promises.",
  },
  {
    Icon: Lock,
    t: "Your designs stay yours",
    d: "NDA on file before the first tech-pack. Patterns, prints and trims are never re-used for another buyer.",
  },
  {
    Icon: FileText,
    t: "Export documentation, prepared in-house",
    d: "Form-E, COO, packing list, commercial invoice — every document handled by our export desk before dispatch.",
  },
];

export default function BuyerPromise() {
  return (
    <section className="py-24 md:py-32 border-t border-border/60">
      <div className="container-luxe">
        <div className="max-w-3xl mb-14">
          <p className="eyebrow mb-6">The Wholesale Promise</p>
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.04]">
            Six commitments we put <span className="text-gold italic">in writing</span>.
          </h2>
          <p className="mt-5 text-foreground/70 text-base leading-relaxed max-w-2xl">
            How we run the account. These commitments sit on every PO we accept.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60">
          {PROMISES.map(({ Icon, t, d }) => (
            <div key={t} className="bg-background p-8 md:p-9 hover:bg-card/50 transition-colors">
              <Icon className="text-gold" size={22} strokeWidth={1.5} />
              <h3 className="font-display text-lg md:text-xl mt-5 leading-snug">{t}</h3>
              <p className="text-sm text-foreground/70 mt-3 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
