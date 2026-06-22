import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, Factory, ShieldCheck, Truck, Award } from "lucide-react";
import { whatsappLink, BRAND } from "@/lib/constants";

import heroImg from "@/assets/hero.jpg";
import catBavarian from "@/assets/cat-bavarian.jpg";
import catLeather from "@/assets/cat-leather.jpg";
import catSportswear from "@/assets/cat-sportswear.jpg";
import catStreetwear from "@/assets/cat-streetwear.jpg";
import catNightwear from "@/assets/cat-nightwear.jpg";
import catLeisure from "@/assets/cat-leisure.jpg";

const macros = [
  {
    id: "bavarian-leather",
    eyebrow: "Macro Pillar 01",
    title: "Bavarian Heritage & Leather Hub",
    description:
      "Hand-crafted Trachten and full-grain leather garments — built by Sialkot artisans for German, Austrian and Swiss wholesalers.",
    images: [catBavarian, catLeather],
    subCategories: [
      { name: "Lederhosen", href: "/products/lederhosen" },
      { name: "Trachten Wear", href: "/products/trachten" },
      { name: "Dirndls", href: "/products/dirndls" },
      { name: "Premium Leather Apparel", href: "/products/leather" },
    ],
    href: "/products/bavarian-leather",
  },
  {
    id: "textile-streetwear-active",
    eyebrow: "Macro Pillar 02",
    title: "Textile, Streetwear & Active Hub",
    description:
      "Heavyweight cut-and-sew, performance activewear and premium sleep & lounge — engineered for USA, UK, Canada and Australia brands.",
    images: [catSportswear, catStreetwear, catNightwear, catLeisure],
    subCategories: [
      { name: "Premium Sportswear", href: "/products/sportswear" },
      { name: "Heavyweight Streetwear", href: "/products/streetwear" },
      { name: "Nightwear", href: "/products/nightwear" },
      { name: "Leisure Wear", href: "/products/leisure" },
    ],
    href: "/products/textile-streetwear-active",
  },
];

const promises = [
  { icon: Factory, title: "Direct Factory", desc: "Owned atelier in Sialkot, Pakistan — no middlemen since 2014." },
  { icon: ShieldCheck, title: "Audited Quality", desc: "BSCI-aligned processes, full-grain leather, OEKO-TEX cotton." },
  { icon: Truck, title: "45-Day Delivery", desc: "Tech-pack to FOB Karachi. Air & sea freight worldwide." },
  { icon: Award, title: "MOQ from 50", desc: "Low minimums for boutique brands and growing labels." },
];

export default function LederhosenHome() {
  return (
    <>
      <Helmet>
        <title>Irha Apparels — Two Macro Hubs: Bavarian Heritage & Global Activewear</title>
        <meta
          name="description"
          content="Sialkot-based manufacturer organised in two macro hubs: Bavarian Heritage & Leather, and Textile, Streetwear & Active. OEM, ODM and Private Label worldwide."
        />
        <link rel="canonical" href="https://www.irhaapparels.com/" />
      </Helmet>

      {/* HERO */}
      <section className="relative isolate min-h-[88vh] flex items-end overflow-hidden bg-background text-foreground">
        <img
          src={heroImg}
          alt="Irha Apparels manufacturing floor in Sialkot"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-20 pt-32">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-6">
            Direct Factory · Sialkot, Pakistan · Since 2014
          </p>
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-tight max-w-4xl">
            Two macro hubs.<br />
            <span className="text-primary">One trusted manufacturer.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Bavarian Heritage & Leather on one side. Textile, Streetwear & Active on the other.
            OEM · ODM · Private Label · MOQ 50 · 45-day delivery worldwide.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/studio#studio-engine"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Launch AI Mockup Studio & FOB Estimator <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 backdrop-blur px-7 py-3.5 text-sm font-medium hover:bg-card transition"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* TWO MACRO PILLARS */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">Our Two Macro Hubs</p>
              <h2 className="font-serif text-3xl md:text-5xl max-w-3xl">
                A focused factory, organised into two production pillars.
              </h2>
            </div>
            <p className="md:max-w-sm text-muted-foreground">
              Every category we manufacture rolls up into one of these two hubs — so buyers always know exactly where their order sits on our floor.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {macros.map((m) => (
              <Link
                key={m.id}
                to={m.href}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/60 transition-all duration-500"
              >
                {/* Image collage */}
                <div className="relative h-80 md:h-96 overflow-hidden">
                  <div
                    className={`grid h-full w-full ${
                      m.images.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
                    } gap-1`}
                  >
                    {m.images.map((src, i) => (
                      <div key={i} className="relative overflow-hidden">
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-8 md:p-10">
                  <h3 className="font-serif text-2xl md:text-3xl mb-4 group-hover:text-primary transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{m.description}</p>

                  <ul className="mb-8 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {m.subCategories.map((s) => (
                      <li key={s.name} className="flex items-center gap-2 text-foreground/80">
                        <span className="h-1 w-1 rounded-full bg-primary" />
                        {s.name}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-primary">
                    Explore the hub
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PROMISES */}
      <section className="border-t border-border bg-card/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-serif text-2xl md:text-4xl mb-12">Why brands choose Irha</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {promises.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-3">
                <Icon className="h-7 w-7 text-primary" />
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-serif text-3xl md:text-5xl mb-6">Start your order today</h2>
          <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">
            Send your tech-pack, sketches or reference samples. We reply within 12 hours with a full FOB Karachi quote.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Request a Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium hover:bg-card transition"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp {BRAND.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
