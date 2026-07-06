import SEO from "@/components/SEO";
import manufacturingImg from "@/assets/manufacturing.jpg";
import { Link } from "react-router-dom";
import { Factory, MessageCircle, PackageCheck } from "lucide-react";

const principles = [
  {
    Icon: Factory,
    title: "Requirement-led manufacturing",
    body: "Materials, construction and finishing are reviewed against the actual program before commitments are made.",
  },
  {
    Icon: PackageCheck,
    title: "Private-label programs",
    body: "Branding, labels, tags and packaging are scoped to the buyer's requirements and confirmed before production.",
  },
];

export default function About() {
  return (
    <>
      <SEO
        title="About Irha Apparels — B2B Apparel Manufacturer in Sialkot"
        description="Irha Apparels is a Sialkot-based B2B custom apparel manufacturer for brands, wholesalers and importers. Our website is new; our manufacturing work is built on hands-on production experience."
        path="/about"
      />

      <section className="pt-40 pb-24 md:pb-32 border-b border-border/60">
        <div className="container-luxe max-w-5xl">
          <p className="eyebrow mb-6">About Irha</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95]">
            Built for serious <span className="text-gold italic">B2B programs</span>.
          </h1>
          <p className="mt-10 max-w-3xl text-lg text-foreground/75 leading-relaxed">
            Irha Apparels is a Sialkot-based custom apparel manufacturer working with brands,
            wholesalers, importers and private-label buyers who need requirement-led production.
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-luxe grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative aspect-[4/5] overflow-hidden">
            <img
              src={manufacturingImg}
              alt="Apparel manufacturing in Sialkot"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          <div>
            <p className="eyebrow mb-5">The honest version</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
              Our online presence is new. <span className="text-gold italic">Our manufacturing work is not</span>.
            </h2>
            <p className="text-foreground/75 leading-relaxed mt-7">
              This website is a newer part of Irha Apparels. The manufacturing work behind it is based on
              hands-on apparel production experience in Sialkot and direct understanding of sampling,
              materials, customization, branding and buyer requirements.
            </p>
            <p className="text-foreground/75 leading-relaxed mt-5">
              MOQ, samples, pricing, production timing, documentation and shipping are confirmed against
              the actual program before a final commitment is made.
            </p>

            <div className="mt-8 border border-gold/40 bg-card/30 p-6">
              <p className="font-display text-2xl">Factory view available by live video call.</p>
              <p className="text-sm text-foreground/65 mt-3 leading-relaxed">
                Buyers can request a live video call to view the manufacturing environment and discuss requirements directly.
              </p>
              <Link
                to="/inquiry?intent=meeting"
                className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-gold hover:text-foreground transition-colors"
              >
                <MessageCircle size={14} /> Request a live video call
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
        <div className="container-luxe grid md:grid-cols-2 gap-px bg-border/60 border border-border/60">
          {principles.map(({ Icon, title, body }) => (
            <article key={title} className="bg-background p-8 md:p-10">
              <Icon size={24} className="text-gold" strokeWidth={1.4} />
              <h3 className="font-display text-2xl mt-6">{title}</h3>
              <p className="text-sm text-foreground/65 mt-4 leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-32 text-center">
        <div className="container-luxe max-w-3xl">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
            Bring the requirement. We will review the <span className="text-gold italic">real production path</span>.
          </h2>
          <Link
            to="/inquiry?intent=rfq"
            className="mt-10 inline-flex bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
          >
            Start an Inquiry
          </Link>
        </div>
      </section>
    </>
  );
}
