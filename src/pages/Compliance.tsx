import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  BadgeCheck,
  Award,
  ClipboardCheck,
  FlaskConical,
  Leaf,
  Factory,
  Download,
  ArrowRight,
  Check,
} from "lucide-react";
import { whatsappLink, BRAND } from "@/lib/constants";

type Status = "Certified" | "Compliant" | "In Progress - Q3 2026";

const CERTS: Array<{
  Icon: typeof ShieldCheck;
  name: string;
  short: string;
  status: Status;
  desc: string;
}> = [
  {
    Icon: ShieldCheck,
    name: "OEKO-TEX® Standard 100",
    short: "Safe fabrics",
    status: "Compliant",
    desc: "Every textile component tested for harmful substances. Mill certificates available with every shipment on request.",
  },
  {
    Icon: ClipboardCheck,
    name: "BSCI",
    short: "Ethical manufacturing",
    status: "In Progress - Q3 2026",
    desc: "Business Social Compliance Initiative audit currently scheduled with our nominated auditor.",
  },
  {
    Icon: BadgeCheck,
    name: "SEDEX SMETA",
    short: "Social audit",
    status: "Certified",
    desc: "Four-pillar audit on labor standards, health & safety, environment and business ethics. SEDEX member ID available on request.",
  },
  {
    Icon: Award,
    name: "ISO 9001:2015",
    short: "Quality systems",
    status: "Compliant",
    desc: "Documented quality management system covering sampling, production, inspection and shipment.",
  },
  {
    Icon: Leaf,
    name: "GOTS",
    short: "Organic textiles",
    status: "Compliant",
    desc: "Global Organic Textile Standard cotton available on request for buyers requiring organic chain-of-custody.",
  },
  {
    Icon: Factory,
    name: "WRAP",
    short: "US compliance",
    status: "In Progress - Q3 2026",
    desc: "Worldwide Responsible Accredited Production — facility audit in preparation for US retail buyers.",
  },
  {
    Icon: FlaskConical,
    name: "REACH",
    short: "EU chemicals",
    status: "Compliant",
    desc: "EU REACH regulation compliance on dyes, chemicals and finishing processes for European retail clients.",
  },
];

const FAQ = [
  {
    q: "Do you provide certificates with shipment?",
    a: "Yes. OEKO-TEX® mill certificates, SEDEX audit summaries and ISO documentation can be attached to each shipment on request. Specify your requirement at PO stage and we include the documents with your commercial invoice and packing list.",
  },
  {
    q: "Can you produce against client-nominated audits?",
    a: "Yes. We accept buyer-nominated third-party audits (BSCI, SMETA, Higg FEM, custom code-of-conduct). Coordinate the audit window during the PO confirmation stage.",
  },
  {
    q: "What does \"In Progress\" mean?",
    a: "We are actively preparing the facility and documentation for the named certification. We do not market in-progress certifications as completed and will update this page the moment the audit is signed off.",
  },
];

export default function Compliance() {
  return (
    <>
      <Helmet>
        <title>Certifications & Ethical Manufacturing | Irha Apparels — Sialkot, Pakistan</title>
        <meta
          name="description"
          content="OEKO-TEX, SEDEX, ISO 9001, BSCI, GOTS, WRAP & REACH compliance status for Irha Apparels — B2B apparel manufacturer in Sialkot, Pakistan. Documentation available with every shipment."
        />
        <link rel="canonical" href="https://www.irhaapparels.com/compliance" />
      </Helmet>

      {/* HERO */}
      <section className="pt-32 pb-12 md:pt-40 md:pb-16 bg-[#0A0A0A] border-b border-border/60">
        <div className="container-luxe">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
            Compliance & Ethical Sourcing
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] max-w-4xl">
            Certifications & <span className="text-gold italic">Ethical Manufacturing</span>
          </h1>
          <p className="mt-6 max-w-2xl text-foreground/70 leading-relaxed">
            This page is maintained by Irha Apparels to give B2B buyers a clear,
            honest view of where each certification stands. We use the word
            "Compliant" when our processes meet the standard, and "In Progress"
            when an audit is scheduled but not yet completed.
          </p>
        </div>
      </section>

      {/* COMMITMENT */}
      <section className="py-16 md:py-20">
        <div className="container-luxe grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">Our Commitment</p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.1]">
              Ethical production, built into the factory floor.
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-4 text-foreground/75 leading-relaxed">
            <p>
              Irha Apparels is a direct-factory B2B apparel manufacturer based in
              Sialkot, Pakistan. We run a single owned facility — no sub-contracting,
              no hidden tiers — so every order is cut, sewn, embroidered and finished
              under one roof by employees we know by name.
            </p>
            <p>
              Our workers are paid above the regional minimum wage, work documented
              shifts with overtime tracked, and have access to clean drinking water,
              ventilated workshops, first-aid stations and prayer space. We do not
              employ anyone under 18 and verify age at hiring.
            </p>
            <p>
              On the materials side we default to OEKO-TEX® Standard 100 fabrics and
              REACH-compliant dyes for European customers, and we can upgrade any
              program to GOTS organic cotton or buyer-nominated mills on request. Our
              quality system follows ISO 9001:2015 principles and is currently being
              prepared for BSCI and WRAP audits in Q3 2026.
            </p>
          </div>
        </div>
      </section>

      {/* CERT GRID */}
      <section className="py-12 md:py-16 border-t border-border/60 bg-secondary/30">
        <div className="container-luxe">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <p className="eyebrow mb-3">Certification Status</p>
              <h2 className="font-display text-3xl md:text-4xl">
                7 standards. Honest status on each.
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {CERTS.map(({ Icon, name, short, status, desc }) => {
              const inProgress = status.startsWith("In Progress");
              return (
                <article
                  key={name}
                  className="border border-border/60 bg-background p-6 md:p-7 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="w-12 h-12 border border-border/70 flex items-center justify-center text-foreground/70">
                      <Icon size={22} strokeWidth={1.4} />
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-[0.22em] px-2 py-1 border ${
                        inProgress
                          ? "border-foreground/30 text-foreground/55"
                          : "border-gold/60 text-gold"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <h3 className="font-display text-xl leading-tight">{name}</h3>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/55 mt-1">
                    {short}
                  </p>
                  <p className="text-sm text-foreground/70 leading-relaxed mt-4">
                    {desc}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* DOWNLOAD */}
      <section className="py-16 md:py-20 border-t border-border/60">
        <div className="container-luxe flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Documentation</p>
            <h2 className="font-display text-2xl md:text-3xl">
              Compliance Profile PDF
            </h2>
            <p className="text-sm text-foreground/65 mt-2 max-w-xl">
              Full overview of our facility, certifications and worker welfare
              practices. Request via WhatsApp or email — we send the latest version
              the same working day.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappLink(
                "Hello Irha Apparels — please send me the latest Compliance Profile PDF.",
              )}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <Download size={14} /> Request PDF
            </a>
            <a
              href="mailto:irhaapparelsofficial@gmail.com?subject=Compliance%20Profile%20PDF%20Request"
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
            Common compliance questions
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
              Speak to compliance lead <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
