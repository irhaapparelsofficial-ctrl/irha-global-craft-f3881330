import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

export default function TermsOfService() {
  const description = "Website terms for Irha Apparels. Commercial order terms, pricing, payment, production, shipping and claims are confirmed separately for each B2B order.";
  const pageUrl = `${SITE_URL}/terms-of-service`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Website Terms | Irha Apparels",
      description,
      isPartOf: { "@id": WEBSITE_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Website Terms", path: "/terms-of-service" },
    ]),
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-24 md:py-32">
      <SEO
        title="Website Terms | Irha Apparels"
        description={description}
        path="/terms-of-service"
        jsonLd={jsonLd}
      />

      <p className="eyebrow mb-5">Website Terms</p>
      <h1 className="font-display text-4xl md:text-6xl leading-[1.05]">
        General website terms. <span className="text-gold italic">Order terms are separate</span>.
      </h1>
      <p className="mt-7 text-foreground/70 leading-relaxed">
        These terms govern use of the Irha Apparels website and inquiry tools. They do not create a final quotation,
        purchase contract, price, payment term, delivery promise or manufacturing commitment.
      </p>

      <div className="mt-14 space-y-10 text-sm leading-relaxed text-foreground/75">
        <section className="border-t border-border/60 pt-8">
          <h2 className="font-display text-2xl text-foreground">1. B2B website purpose</h2>
          <p className="mt-3">
            The website is intended for brands, wholesalers, importers, retailers, distributors and other business buyers seeking custom apparel manufacturing.
          </p>
        </section>

        <section className="border-t border-border/60 pt-8">
          <h2 className="font-display text-2xl text-foreground">2. Inquiry content is not a final quote</h2>
          <p className="mt-3">
            Product pages, mockups, AI concepts, forms, messages and general website content are for requirement discussion. Final feasibility, specification, price, MOQ, payment terms, production timing and shipping are confirmed separately by the Irha Apparels team.
          </p>
        </section>

        <section className="border-t border-border/60 pt-8">
          <h2 className="font-display text-2xl text-foreground">3. Order-specific commercial terms</h2>
          <p className="mt-3">
            A B2B order is governed by the quotation, pro forma invoice, purchase order acceptance, specification approval and other commercial documents agreed for that order. Where those documents conflict with general website text, the agreed order documents control.
          </p>
        </section>

        <section className="border-t border-border/60 pt-8">
          <h2 className="font-display text-2xl text-foreground">4. Samples and approvals</h2>
          <p className="mt-3">
            Sample cost, development scope, approvals and any effect on bulk production are confirmed for the specific program. Do not rely on a generic website statement as approval to begin production.
          </p>
        </section>

        <section className="border-t border-border/60 pt-8">
          <h2 className="font-display text-2xl text-foreground">5. Buyer-provided intellectual property</h2>
          <p className="mt-3">
            Buyers are responsible for having the right to use logos, artwork, designs, trademarks and other files they submit. Private-label and confidentiality requirements should be stated during the commercial discussion.
          </p>
        </section>

        <section className="border-t border-border/60 pt-8">
          <h2 className="font-display text-2xl text-foreground">6. AI concept previews</h2>
          <p className="mt-3">
            AI-generated mockups are non-binding concept previews for requirement discussion. Final materials, construction, color matching, manufacturability, price and timing require human review.
          </p>
        </section>

        <section className="border-t border-border/60 pt-8">
          <h2 className="font-display text-2xl text-foreground">7. Website accuracy and updates</h2>
          <p className="mt-3">
            We may update website content, product presentation and available tools. A change to website content does not automatically amend an already agreed order.
          </p>
        </section>

        <section className="border-t border-border/60 pt-8">
          <h2 className="font-display text-2xl text-foreground">8. Contact</h2>
          <p className="mt-3">
            For commercial terms, send the actual requirement through the inquiry flow or contact the Irha Apparels team directly.
          </p>
        </section>
      </div>

      <div className="mt-14 flex flex-wrap gap-3">
        <Link
          to="/inquiry?intent=rfq"
          className="bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.28em] hover:shadow-gold transition-all"
        >
          Start an Inquiry
        </Link>
        <Link
          to="/contact"
          className="border border-gold/70 text-gold px-7 py-4 text-xs uppercase tracking-[0.28em] hover:bg-gold hover:text-background transition-colors"
        >
          Contact Team
        </Link>
      </div>
    </main>
  );
}
