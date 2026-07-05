import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ClipboardCheck,
  FlaskConical,
  Leaf,
  Factory,
  Download,
  ArrowRight,
  FileText,
} from "lucide-react";
import { whatsappLink } from "@/lib/constants";

const CAPABILITIES: Array<{
  Icon: typeof ShieldCheck;
  name: string;
  short: string;
  desc: string;
}> = [
  {
    Icon: ShieldCheck,
    name: "Material Documentation",
    short: "Fabric & trim traceability",
    desc: "Mill and supplier documentation for fabrics, leather and trims prepared per program on request.",
  },
  {
    Icon: ClipboardCheck,
    name: "Buyer-Nominated Audits",
    short: "Third-party audits welcome",
    desc: "Buyer-nominated third-party audits (SMETA, Higg FEM or your own code of conduct) accepted per program.",
  },
  {
    Icon: FlaskConical,
    name: "Chemical Compliance",
    short: "Aligned to destination market",
    desc: "Dye and chemical selection scoped to your destination market's regulatory requirements.",
  },
  {
    Icon: Leaf,
    name: "Organic & Recycled Options",
    short: "Fabric programs on request",
    desc: "Organic cotton and recycled polyester fabric programs sourced on request with chain-of-custody where required.",
  },
  {
    Icon: Factory,
    name: "Documented Production",
    short: "Process consistency",
    desc: "Cut, stitch, wash and finishing steps documented per order to keep programs consistent from sample to bulk.",
  },
  {
    Icon: FileText,
    name: "Export Documentation",
    short: "Form-E · COO · Packing List",
    desc: "Form-E, Certificate of Origin, packing lists and commercial invoices prepared in-house for every shipment.",
  },
];

const FAQ = [
  {
    q: "Do you provide documentation with shipment?",
    a: "Yes. Fabric mill documentation, material sourcing details, packing lists, Form-E and Certificate of Origin are prepared with each shipment. Specify any additional documentation you need at PO stage.",
  },
  {
    q: "Can you produce against a buyer-nominated audit?",
    a: "Yes. We accept buyer-nominated third-party audits — SMETA, Higg FEM or a custom code of conduct. Coordinate the audit window during PO confirmation.",
  },
  {
    q: "Do you publish certification logos?",
    a: "We publish certificates only once they are issued, verified and approved for public display. Where a specific certificate is required for your program, share the requirement with your inquiry and we will confirm what we can provide per shipment.",
  },
];

export default function Compliance() {
  return (
    <>
      <Helmet>
        <title>Compliance & Documentation | Irha Apparels — Sialkot, Pakistan</title>
        <meta
          name="description"
          content="Compliance and documentation capabilities at Irha Apparels — material traceability, buyer-nominated audits, chemical management aligned to your destination market, and full export documentation."
        />
        <link rel="canonical" href="https://www.irhaapparels.com/compliance" />
      </Helmet>

      {/* HERO */}
      <section className="pt-32 pb-12 md:pt-40 md:pb-16 bg-[#0A0A0A] border-b border-border/60">
        <div className="container-luxe">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
            Compliance & Documentation
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] max-w-4xl">
            Documentation, <span className="text-gold italic">buyer-aligned</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-foreground/70 leading-relaxed">
            This page describes the compliance and documentation capabilities Irha Apparels
            can prepare per program. Specific certifications will be published here once
            they are issued and approved for public display.
          </p>
        </div>
      </section>

      {/* COMMITMENT */}
      <section className="py-16 md:py-20">
        <div className="container-luxe grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">How We Work</p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.1]">
              Direct-factory production, documented per program.
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-4 text-foreground/75 leading-relaxed">
            <p>
              Irha Apparels is a direct-factory B2B apparel manufacturer based in
              Sialkot, Pakistan. Production is handled in-house so cutting, stitching,
              embellishment and finishing are traceable through a single workflow.
            </p>
            <p>
              Materials, packaging, labelling and export documentation are scoped to
              each program's requirements — including buyer-nominated fabric mills,
              chemical restrictions and destination-market regulatory needs.
            </p>
            <p>
              Where a specific certification is required for your program, share the
              requirement with your inquiry and we will confirm what documentation
              can be prepared per shipment.
            </p>
          </div>
        </div>
      </section>

      {/* CAPABILITY GRID */}
      <section className="py-12 md:py-16 border-t border-border/60 bg-secondary/30">
        <div className="container-luxe">
          <div className="mb-10">
            <p className="eyebrow mb-3">Capabilities</p>
            <h2 className="font-display text-3xl md:text-4xl">
              Six documentation & compliance capabilities.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {CAPABILITIES.map(({ Icon, name, short, desc }) => (
              <article
                key={name}
                className="border border-border/60 bg-background p-6 md:p-7 flex flex-col"
              >
                <div className="w-12 h-12 border border-gold/40 flex items-center justify-center text-gold mb-5">
                  <Icon size={22} strokeWidth={1.4} />
                </div>
                <h3 className="font-display text-xl leading-tight">{name}</h3>
                <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/55 mt-1">
                  {short}
                </p>
                <p className="text-sm text-foreground/70 leading-relaxed mt-4">
                  {desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="py-16 md:py-20 border-t border-border/60">
        <div className="container-luxe flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Documentation Request</p>
            <h2 className="font-display text-2xl md:text-3xl">
              Ask about documentation for your program
            </h2>
            <p className="text-sm text-foreground/65 mt-2 max-w-xl">
              Share your program requirements and we will confirm exactly which
              documents can be prepared per shipment.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappLink(
                "Hello Irha Apparels — please confirm the documentation you can prepare for my program.",
              )}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <Download size={14} /> Ask on WhatsApp
            </a>
            <a
              href="mailto:irhaapparelsofficial@gmail.com?subject=Documentation%20Request"
              className="inline-flex items-center gap-2 border border-gold/70 text-gold hover:bg-gold hover:text-background px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              Email request
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 border-t border-border/60 bg-secondary/30">
        <div className="container-luxe max-w-3xl">
          <p className="eyebrow mb-3">Buyer FAQ</p>
          <h2 className="font-display text-3xl md:text-4xl mb-10">
            Common documentation questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group border border-border/60 bg-background p-5 md:p-6"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-base md:text-lg pr-4">{f.q}</span>
                  <span className="text-gold text-xl group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="mt-4 text-sm text-foreground/70 leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              Speak to our team <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
