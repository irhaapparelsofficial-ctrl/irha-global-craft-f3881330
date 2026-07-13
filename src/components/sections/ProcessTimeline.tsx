import { CheckCircle2, ClipboardList, PackageCheck, Scissors } from "lucide-react";

const STEPS = [
  {
    Icon: ClipboardList,
    number: "01",
    title: "Share the requirement",
    text: "Send the product, quantity, destination, customization and any reference or tech pack.",
  },
  {
    Icon: Scissors,
    number: "02",
    title: "Develop and sample",
    text: "Materials, construction, branding and the sample path are reviewed for the actual style.",
  },
  {
    Icon: CheckCircle2,
    number: "03",
    title: "Approve before bulk",
    text: "Confirm specifications, requested changes and the commercial scope before production commitment.",
  },
  {
    Icon: PackageCheck,
    number: "04",
    title: "Produce, pack and dispatch",
    text: "Production, quality review, packing and shipping documentation follow the approved order requirements.",
  },
];

export default function ProcessTimeline() {
  return (
    <section className="bg-background py-16 text-foreground md:py-20">
      <div className="container-luxe">
        <div className="mb-8 grid gap-5 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">How the process works</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
              A clear path from buyer brief to approved production.
            </h2>
          </div>
          <p className="text-sm leading-7 text-foreground/65 lg:col-span-4">
            Every program is reviewed on its own requirements. MOQ, pricing, timing and shipping are confirmed before commitment.
          </p>
        </div>

        <div className="grid gap-px border border-border/60 bg-border/60 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, number, title, text }) => (
            <article key={number} className="relative bg-card p-5 md:p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center border border-primary/30 bg-primary/8 text-primary">
                  <Icon size={18} strokeWidth={1.6} />
                </span>
                <span className="font-display text-2xl text-primary/25">{number}</span>
              </div>
              <h3 className="mt-5 font-sans text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-foreground/62">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
