import { Link } from "react-router-dom";
import { ArrowRight, FileBadge2, FileCheck2, MessageSquareText, ShieldCheck, Video } from "lucide-react";
import { SCCI_PROVISIONAL_MEMBERSHIP } from "@/lib/publicBusinessEvidence.mjs";

const TRUST = [
  {
    Icon: FileBadge2,
    title: SCCI_PROVISIONAL_MEMBERSHIP.statusLabel,
    text: `Membership No. ${SCCI_PROVISIONAL_MEMBERSHIP.membershipNumber} · Provisional certificate issued ${SCCI_PROVISIONAL_MEMBERSHIP.issuedDateLabel}.`,
  },
  {
    Icon: FileCheck2,
    title: "Requirement-based quotation",
    text: "Material, construction, branding, quantity, packing and destination are reviewed before commercial terms are prepared.",
  },
  {
    Icon: ShieldCheck,
    title: "Approval before bulk",
    text: "The sample route, requested changes and approved specification remain the reference for production discussion.",
  },
  {
    Icon: Video,
    title: "Factory verification",
    text: "A scheduled live factory video call can be requested when a buyer wants additional manufacturing verification.",
  },
];

const FAQ = [
  {
    question: "What is the minimum order quantity?",
    answer: "MOQ is confirmed for the actual product, material, construction and customization. Send the style and approximate quantity for a scoped response.",
  },
  {
    question: "Can you develop a sample before bulk production?",
    answer: "Yes. The sample path, material options, measurements, branding and requested revisions are reviewed for the actual buyer requirement before a bulk commitment.",
  },
  {
    question: "Can you add our labels, printing and packaging?",
    answer: "Private-label requirements can include embroidery, printing, woven labels, care labels, hangtags and packaging. Availability and cost are confirmed per product.",
  },
  {
    question: "Do you ship internationally?",
    answer: "The destination, packing, documentation and preferred shipping arrangement are reviewed with each order. Final shipping terms are confirmed before commitment.",
  },
  {
    question: "What should a buyer send first?",
    answer: "A product photo, sketch or tech pack, approximate quantity, material preference, branding needs, size range and delivery destination are the best starting points.",
  },
];

export default function BuyerDecisionSection() {
  const openLiveChat = () => window.dispatchEvent(new CustomEvent("irha:open-human-chat"));

  return (
    <section className="border-y border-border/60 bg-card/30 py-14 text-foreground md:py-18">
      <div className="container-luxe">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[10px]">Buyer confidence</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
              Clear answers before you move forward.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/65">
              A B2B manufacturing decision needs evidence, clear scope and a direct route to the team handling the requirement.
            </p>

            <div className="mt-6 grid gap-2.5">
              {TRUST.map(({ Icon, title, text }) => (
                <article key={title} className="flex gap-3 rounded-xl border border-border/70 bg-background p-4 sm:rounded-none">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/8 text-primary sm:rounded-none">
                    <Icon size={17} strokeWidth={1.7} />
                  </span>
                  <div>
                    <h3 className="font-sans text-sm font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-foreground/60">{text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button type="button" onClick={openLiveChat} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-gradient-gold px-5 text-[9px] font-semibold uppercase tracking-[0.17em] text-primary-foreground">
                <MessageSquareText size={14} /> Ask the team
              </button>
              <Link to="/buyer-trust#scci-membership" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border/70 px-5 text-[9px] font-semibold uppercase tracking-[0.17em] text-foreground/75 hover:border-primary hover:text-primary">
                Buyer trust center · SCCI evidence <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">Common buyer questions</p>
                <h3 className="mt-2 font-display text-2xl sm:text-3xl">Before requesting a quotation</h3>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/70 bg-background sm:rounded-none">
              {FAQ.map((item, index) => (
                <details key={item.question} className="group border-b border-border/60 last:border-b-0" open={index === 0}>
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-foreground marker:content-none sm:px-5">
                    <span>{item.question}</span>
                    <span className="text-lg font-normal text-primary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-6 text-foreground/62 sm:px-5 sm:pb-5">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
