import { FileText, MessagesSquare, Video, Lock, Clock, Receipt } from "lucide-react";

const PROMISES = [
  {
    Icon: Receipt,
    t: "Transparent, line-item pricing",
    d: "Full cost breakdown — fabric, trims, labour, finishing. No middle-man markup, no surprise invoices at shipment.",
  },
  {
    Icon: MessagesSquare,
    t: "Direct line to the Managing Director",
    d: "Every wholesale account is handled by the MD personally — not a junior account manager. One WhatsApp, one decision-maker.",
  },
  {
    Icon: Video,
    t: "Pre-shipment video QC, always",
    d: "Before the container seals, you receive a full video walkthrough of cartons, labels and a randomized 7-point inspection.",
  },
  {
    Icon: Clock,
    t: "Lead times we actually hit",
    d: "45-day FOB on standard programs, contractually guaranteed. Penalty clauses welcomed on PO — we ship on date or we pay.",
  },
  {
    Icon: Lock,
    t: "Designs stay yours",
    d: "NDA on file before the first tech-pack. Patterns, prints and trims never re-sold to another buyer — written into our SOP.",
  },
  {
    Icon: FileText,
    t: "Documentation, done right",
    d: "Form-E, COO, Packing List, Commercial Invoice, OEKO-TEX certificates — every doc delivered before vessel ETA, no chasing.",
  },
];

export default function BuyerPromise() {
  return (
    <section className="py-24 md:py-32 border-t border-border/60">
      <div className="container-luxe">
        <div className="max-w-3xl mb-16">
          <p className="eyebrow mb-6">The Wholesale Promise</p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.02]">
            Six commitments we put <span className="text-gold italic">in writing</span>.
          </h2>
          <p className="mt-6 text-foreground/70 text-base md:text-lg leading-relaxed max-w-2xl">
            What separates Irha from the typical Sialkot supplier isn't the machinery —
            it's how we run the account. These promises sit on every PO we accept.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60">
          {PROMISES.map(({ Icon, t, d }) => (
            <div
              key={t}
              className="bg-background p-8 md:p-10 hover:bg-card/50 transition-colors"
            >
              <Icon className="text-primary" size={22} strokeWidth={1.5} />
              <h3 className="font-display text-xl md:text-2xl mt-6 leading-snug">{t}</h3>
              <p className="text-sm text-foreground/70 mt-3 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
