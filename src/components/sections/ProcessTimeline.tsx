import { CheckCircle2, ClipboardList, PackageCheck, Scissors } from "lucide-react";

const STEPS = [
  { Icon: ClipboardList, number: "01", title: "Share the brief", text: "Send the product, quantity, destination, customization and any reference or tech pack." },
  { Icon: Scissors, number: "02", title: "Review & sample", text: "Materials, construction, branding and the sample route are reviewed for the style." },
  { Icon: CheckCircle2, number: "03", title: "Approve the scope", text: "Confirm specifications, requested changes and commercial terms before bulk." },
  { Icon: PackageCheck, number: "04", title: "Produce & dispatch", text: "Production, quality review, packing and shipping follow the approved order." },
];

export default function ProcessTimeline() {
  return (
    <section id="process" className="scroll-mt-24 bg-background py-12 text-foreground md:py-18">
      <div className="container-luxe">
        <div className="mb-5 grid gap-3 lg:mb-7 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary sm:text-[10px]">How it works</p>
            <h2 className="mt-2 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">From buyer brief to approved production.</h2>
          </div>
          <p className="text-sm leading-6 text-foreground/65 lg:col-span-4 lg:leading-7">
            MOQ, pricing, timing and shipping are confirmed against the actual product before commitment.
          </p>
        </div>

        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-2.5 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-px lg:border lg:border-border/60 lg:bg-border/60">
          {STEPS.map(({ Icon, number, title, text }) => (
            <article key={number} className="min-w-[78%] snap-start rounded-xl border border-border/70 bg-card p-4 sm:min-w-0 sm:p-5 lg:rounded-none lg:border-0 lg:p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/8 text-primary lg:rounded-none">
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <span className="font-display text-xl text-primary/30">{number}</span>
              </div>
              <h3 className="mt-4 font-sans text-sm font-semibold text-foreground sm:text-base">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-foreground/62 sm:text-sm sm:leading-6">{text}</p>
            </article>
          ))}
        </div>
        <p className="mt-2 text-center text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:hidden">Swipe through the order process</p>
      </div>
    </section>
  );
}
