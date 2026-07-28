import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { Check, MessageCircle, ShieldCheck } from "lucide-react";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

const STEPS = [
  ["01", "Requirement Review", "Product, quantity, material, branding, sizing and destination needs are reviewed first."],
  ["02", "Sample & Specification", "References or tech packs are translated into the details needed for sampling and costing."],
  ["03", "Material & Trim Confirmation", "Fabric, leather, trims, labels and packaging are confirmed against the buyer requirement."],
  ["04", "Production Planning", "Construction, decoration and finishing methods are reviewed before timing and commercial terms are confirmed."],
  ["05", "Quality Review", "Measurements, workmanship and packaging checks are matched to the approved product requirement."],
  ["06", "Dispatch Preparation", "Packing, labels, shipment documents and logistics requirements are confirmed for the approved order."],
] as const;

const CAPABILITIES = [
  "Cut-and-sew apparel program review",
  "Embroidery and print option review",
  "Private labels, care labels and hangtags",
  "Custom packaging options",
  "Sampling and product development",
  "Buyer-specified materials and trims",
];

export default function Manufacturing() {
  const description = "How Irha Apparels reviews custom B2B apparel programs, from requirements and sampling to production planning, quality review and dispatch preparation.";
  const pageUrl = `${SITE_URL}/manufacturing`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Manufacturing Process — Irha Apparels Sialkot",
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Manufacturing", path: "/manufacturing" }]),
  ];

  return (
    <>
      <SEO title="Manufacturing Process — Irha Apparels Sialkot" description={description} path="/manufacturing" jsonLd={jsonLd} />

      <section className="relative overflow-hidden pb-24 pt-40 md:pb-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_8%,hsl(var(--gold)/0.12),transparent_35%)]" />
        <div className="container-luxe relative">
          <p className="eyebrow mb-6">Manufacturing</p>
          <h1 className="max-w-5xl font-display text-5xl leading-[0.95] md:text-7xl lg:text-8xl">From requirement to a <span className="text-gold italic">reviewed production path</span>.</h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/75">Each program is reviewed against its construction, material, branding, quantity and destination needs before feasibility, price or timing is confirmed.</p>
          <div className="mt-7 max-w-3xl border border-amber-500/30 bg-amber-500/[0.04] p-5">
            <p className="flex items-start gap-3 text-sm leading-7 text-foreground/68"><ShieldCheck size={18} className="mt-1 shrink-0 text-amber-300" />Genuine factory photography and video is pending. This page uses process information—not concept visuals—as its evidence.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-24 md:py-32">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Typical workflow</p>
          <h2 className="mb-14 max-w-2xl font-display text-4xl leading-[1.05] md:text-5xl">Clear steps before <span className="text-gold italic">commitments</span>.</h2>
          <div className="grid gap-x-16 gap-y-2 md:grid-cols-2">
            {STEPS.map(([n, title, body]) => (
              <article key={n} className="grid grid-cols-[auto_1fr] gap-8 border-b border-border/60 py-10">
                <p className="font-display text-5xl text-gold">{n}</p>
                <div><h3 className="font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-foreground/70">{body}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/40 py-24 md:py-32">
        <div className="container-luxe grid items-start gap-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-4">Capabilities</p>
            <h2 className="font-display text-4xl leading-[1.05] md:text-5xl">Confirmed against the <span className="text-gold italic">actual program</span>.</h2>
            <p className="mt-6 text-sm leading-relaxed text-foreground/65">Quantity, samples, production timing, price and shipping are confirmed after requirement review.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{CAPABILITIES.map((item) => <div key={item} className="flex items-start gap-3 border border-border/60 bg-background p-6"><Check size={18} className="mt-0.5 shrink-0 text-gold" /><span className="text-foreground/80">{item}</span></div>)}</div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-luxe grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow mb-4">Direct trust check</p>
            <h2 className="font-display text-4xl leading-[1.05] md:text-5xl">Request an appointment-based <span className="text-gold italic">live video call</span>.</h2>
            <p className="mt-6 max-w-3xl leading-relaxed text-foreground/70">Share the product category, questions, preferred time window and timezone. The team confirms availability and viewing scope after review.</p>
          </div>
          <Link to="/inquiry?intent=meeting" className="inline-flex min-h-12 items-center gap-3 bg-gradient-gold px-8 text-xs uppercase tracking-[0.3em] text-primary-foreground hover:shadow-gold"><MessageCircle size={15} /> Request live video call</Link>
        </div>
      </section>
    </>
  );
}
