import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Gauge, Layers3, PlayCircle, Scissors, Shirt, Video } from "lucide-react";
import factoryPoster from "@/assets/banners/factory-cinematic.jpg";

const infrastructure = [
  { icon: Shirt, title: "Industrial stitching workflow", detail: "Line planning, operation sequencing and workmanship checkpoints are reviewed against the approved sample." },
  { icon: Scissors, title: "Pattern, grading and cutting", detail: "Patterns, size grading, marker planning and cutting requirements are confirmed for each programme." },
  { icon: Layers3, title: "Branding and finishing", detail: "Embroidery, printing, labels, care labels, hang tags and packing are scoped before quotation." },
  { icon: Gauge, title: "Quality and dispatch control", detail: "Inspection points, packing method, shipment terms and required documents are agreed with the buyer." },
] as const;

const metrics = [
  { value: "100%", label: "Export-focused B2B manufacturing" },
  { value: "HTML5", label: "Self-hosted factory video container" },
  { value: "25 MB", label: "Private tech-pack upload per file" },
  { value: "Live", label: "Factory verification call available" },
] as const;

export default function FactoryInfrastructure() {
  return (
    <section className="border-y border-border/60 bg-card/20 py-16 md:py-24" aria-labelledby="factory-infrastructure-title">
      <div className="container-luxe">
        <div className="grid gap-10 xl:grid-cols-[1.05fr_.95fr] xl:items-end">
          <div>
            <p className="eyebrow">Factory infrastructure & capacity</p>
            <h2 id="factory-infrastructure-title" className="mt-4 max-w-4xl font-display text-4xl leading-[1.02] md:text-6xl">Validate the production plan before <span className="text-gold italic">bulk commitment</span>.</h2>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-foreground/66 md:text-base">Equipment scope, monthly volume, line allocation and delivery capacity are confirmed against the buyer’s product, construction, order quantity and target timeline. Irha Apparels does not publish an unsupported blanket capacity figure.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="border border-border/60 bg-background/40 p-5">
                <p className="font-display text-3xl text-primary md:text-4xl">{metric.value}</p>
                <p className="mt-2 text-[10px] uppercase leading-5 tracking-[0.16em] text-foreground/50">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-7 xl:grid-cols-[1.08fr_.92fr]">
          <div className="relative min-h-[360px] overflow-hidden border border-border/60 bg-black md:min-h-[480px]">
            <video className="absolute inset-0 h-full w-full object-cover" poster={factoryPoster} autoPlay muted loop playsInline preload="metadata" aria-label="Irha Apparels factory floor walkthrough">
              <source src="/media/factory-floor-walkthrough.webm" type="video/webm" />
              <source src="/media/factory-floor-walkthrough.mp4" type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 md:p-8">
              <div className="flex items-center gap-3 text-gold"><PlayCircle size={24} /><span className="text-[10px] uppercase tracking-[0.22em]">30-second walkthrough container</span></div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">Self-hosted HTML5 video only—no external player logo, recommendations or tracking overlay. The poster remains visible if the approved factory clip has not yet been published.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {infrastructure.map((item) => (
              <article key={item.title} className="border border-border/60 bg-background/35 p-6">
                <item.icon size={21} className="text-primary" />
                <h3 className="mt-4 font-display text-2xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/60">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border border-primary/25 bg-primary/5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-1 shrink-0 text-primary" /><p className="max-w-3xl text-sm leading-7 text-foreground/68">For an auditable capacity answer, share the target quantity, size ratio, materials, embellishments and required delivery window. The team can then show relevant working areas during a live call.</p></div>
          <Link to="/factory-video-call" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-primary/50 px-5 text-[10px] uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"><Video size={14} /> Request factory view <ArrowUpRight size={13} /></Link>
        </div>
      </div>
    </section>
  );
}
