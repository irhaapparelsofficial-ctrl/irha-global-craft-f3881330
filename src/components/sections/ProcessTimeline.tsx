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
    <section className="bg-[#f8f6f1] py-20 text-[#122033] md:py-24">
      <div className="container-luxe">
        <div className="mb-10 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a77f34]">How the process works</p>
            <h2 className="mt-4 max-w-4xl font-display text-4xl leading-[1.04] md:text-5xl lg:text-6xl">
              A clear path from buyer brief to approved production.
            </h2>
          </div>
          <p className="text-sm leading-7 text-[#617082] lg:col-span-4">
            Every program is reviewed on its own requirements. MOQ, pricing, timing and shipping are confirmed before commitment.
          </p>
        </div>

        <div className="grid gap-px border border-[#ded8cd] bg-[#ded8cd] md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, number, title, text }) => (
            <article key={number} className="relative bg-white p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center border border-[#d7c9a8] bg-[#f8f4eb] text-[#a77f34]">
                  <Icon size={19} strokeWidth={1.6} />
                </span>
                <span className="font-display text-3xl text-[#d7c9a8]">{number}</span>
              </div>
              <h3 className="mt-6 font-sans text-base font-semibold text-[#122033]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#617082]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
