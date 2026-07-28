import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, ClipboardCheck, Eye, FileCheck2, ShieldCheck, Video } from "lucide-react";

const CHECKS = [
  {
    icon: ClipboardCheck,
    title: "Program context",
    detail: "Share the product category, target quantity, destination and the questions your buying or quality team needs covered.",
  },
  {
    icon: Eye,
    title: "Viewing scope",
    detail: "The team confirms which relevant working areas can be shown live, subject to active operations, privacy and safety.",
  },
  {
    icon: FileCheck2,
    title: "Written follow-up",
    detail: "Specifications, sampling decisions and commercial details remain separate written approvals after the call.",
  },
  {
    icon: ShieldCheck,
    title: "No automatic proof claims",
    detail: "A website image, video call or discussion does not replace program-specific documents, samples or agreed quality controls.",
  },
] as const;

export default function FactoryInfrastructure() {
  return (
    <section className="border-y border-border/60 bg-card/20 py-16 md:py-24" aria-labelledby="factory-infrastructure-title">
      <div className="container-luxe">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="eyebrow">Live verification process</p>
            <h2 id="factory-infrastructure-title" className="mt-4 max-w-4xl font-display text-4xl leading-[1.02] md:text-6xl">
              Request a focused factory call <span className="text-gold italic">for the actual program</span>.
            </h2>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-foreground/66 md:text-base">
              Equipment scope, line allocation, capacity and timing are reviewed against the buyer brief. No blanket production figure is published here.
            </p>
            <div className="mt-6 border border-amber-500/30 bg-amber-500/[0.04] p-5">
              <p className="text-sm leading-7 text-foreground/70">
                Real factory photography and prerecorded walkthrough video are pending. This section deliberately uses no concept or stock visual as production proof.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CHECKS.map((item) => (
              <article key={item.title} className="border border-border/60 bg-background/35 p-6">
                <item.icon size={21} className="text-primary" />
                <h3 className="mt-4 font-display text-2xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/60">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border border-primary/25 bg-primary/5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-1 shrink-0 text-primary" />
            <p className="max-w-3xl text-sm leading-7 text-foreground/68">
              A requested time is not automatically booked. The team confirms availability, communication channel and viewing scope after reviewing the category and questions.
            </p>
          </div>
          <Link to="/factory-video-call" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-primary/50 px-5 text-[10px] uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground">
            <Video size={14} /> Request factory call <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}
