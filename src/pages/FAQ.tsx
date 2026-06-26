import SEO from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { whatsappLink } from "@/lib/constants";

const FAQS = [
  {
    group: "Ordering & MOQ",
    items: [
      { q: "What is your minimum order quantity (MOQ)?", a: "Our standard MOQ is 50 pieces per design/color across all categories — streetwear, trachten, leather, performance and lounge. Our emerging-brand program allows mixed-size runs at this 50-piece minimum." },
      { q: "Can I order mixed sizes and colors within the MOQ?", a: "Yes. Within a single style/print, you can split across sizes (XS–3XL) freely. Color splits within the 50-piece MOQ are accepted at 25 pieces per color minimum after the initial MOQ is met." },
      { q: "Do you accept small trial orders before bulk?", a: "Absolutely. We offer paid sampling and a 'pilot run' option (typically 25–50 pieces) before committing to full bulk, so you can validate fit, fabric and finish on your retail floor." },
    ],
  },
  {
    group: "Samples",
    items: [
      { q: "How much does a sample cost?", a: "Sample costs range from $40 to $250 depending on category (knit vs. leather vs. embellished). Sample fees are 100% refundable against bulk orders above 500 units." },
      { q: "How long does sampling take?", a: "Pre-production samples are typically ready in 7–14 days from receipt of tech pack and approved counter-samples for fabric/trims." },
      { q: "Do you provide development for new designs?", a: "Yes — our ODM team includes pattern makers, illustrators and a CAD studio. We can develop from sketch, reference image, or a competitor sample." },
    ],
  },
  {
    group: "Customization",
    items: [
      { q: "What customization options do you offer?", a: "Full OEM/ODM/Private Label service: custom fabrics, prints, embroidery, sublimation, puff print, DTG, custom hardware (zippers, buttons, snaps), woven & leather labels, hangtags, branded packaging and gift boxes." },
      { q: "Can you match a specific Pantone color?", a: "Yes. Lab dips are produced for any Pantone TCX/TPX shade with shade approval before bulk. Approved shades are then locked across all production lots." },
      { q: "Do you produce private label / white label?", a: "Yes. We produce under your brand exclusively — no Irha labels appear on your goods. Full IP confidentiality NDAs available." },
    ],
  },
  {
    group: "Shipping & Logistics",
    items: [
      { q: "What are your shipping options?", a: "FOB Sialkot (default), CIF, DDP and door-to-door air or sea freight. We work with DHL, FedEx, Maersk and Hapag-Lloyd for direct relationships and competitive rates." },
      { q: "What are typical lead times?", a: "25–45 days for knits and sportswear, 45–60 days for trachten and leather. Air freight adds 5–7 days; sea freight 25–35 days depending on destination." },
      { q: "Which countries do you regularly export to?", a: "USA, Germany, UK, France, Italy, Netherlands, UAE, KSA, Canada, Australia and 20+ others. We handle export documentation, customs and certificates of origin in-house." },
    ],
  },
  {
    group: "Payment",
    items: [
      { q: "What payment terms do you accept?", a: "30% deposit on PO, 70% balance against B/L copy or before dispatch. For repeat clients we offer 30/70 net 30 and L/C at sight options." },
      { q: "Which payment methods do you accept?", a: "T/T (bank wire), Letter of Credit, Wise, PayPal (for samples & small balances). We do not accept crypto." },
      { q: "Do you offer credit terms for established buyers?", a: "Yes. After 3 successful production cycles, we extend net-30 or net-45 terms based on order volume and credit reference." },
    ],
  },
  {
    group: "Quality & Compliance",
    items: [
      { q: "What QC standards do you follow?", a: "AQL 2.5 (general level II) is our default. 7-point inspection covering measurement, stitching, seams, trims, wash, packaging and shade. Third-party inspections (SGS, Intertek, Bureau Veritas) welcomed on buyer's account." },
      { q: "Are your fabrics certified?", a: "Yes — OEKO-TEX 100 is standard. GOTS organic, BCI cotton, RWS wool, FSC bamboo, LWG leather and recycled polyester options on request." },
      { q: "What is your defect policy?", a: "Any garment failing your approved AQL is replaced or credited in full. We document and resolve defects within 14 days of buyer notification." },
    ],
  },
];

export default function FAQ() {
  return (
    <>
      <SEO
        title="FAQ — MOQ, Samples, Shipping & Pricing | Irha Apparels"
        description="Common questions about ordering apparel from Irha Apparels — MOQs, sampling, customization, shipping, payment terms and quality standards for B2B buyers."
        path="/faq"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.flatMap((g) =>
            g.items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            }))
          ),
        }}
      />

      <section className="pt-40 pb-20 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Buyer Resource</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            Everything you need to <span className="text-gold italic">place an order</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/75">
            Direct answers on MOQs, sampling, lead times, payment and compliance — written for sourcing managers,
            buyers and emerging brand founders.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe grid lg:grid-cols-12 gap-16">
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-32 space-y-3">
              <p className="eyebrow mb-4">Browse</p>
              {FAQS.map((g) => (
                <a
                  key={g.group}
                  href={`#${g.group.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  className="block text-sm text-foreground/70 hover:text-primary hover-gold-underline w-fit"
                >
                  {g.group}
                </a>
              ))}
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-16">
            {FAQS.map((g) => (
              <div key={g.group} id={g.group.toLowerCase().replace(/[^a-z]+/g, "-")} className="scroll-mt-32">
                <p className="eyebrow mb-6">{g.group}</p>
                <Accordion type="single" collapsible className="space-y-3">
                  {g.items.map((item, idx) => (
                    <AccordionItem
                      key={item.q}
                      value={`${g.group}-${idx}`}
                      className="border border-border/60 bg-card/40 px-6 data-[state=open]:border-primary/40 transition-colors"
                    >
                      <AccordionTrigger className="font-display text-lg md:text-xl text-left hover:no-underline py-6">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-foreground/75 leading-relaxed text-sm md:text-base pb-6">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-28 border-t border-border/60 bg-secondary/40">
        <div className="container-luxe text-center max-w-3xl">
          <h2 className="font-display text-3xl md:text-4xl leading-[1.05]">
            Question we didn't <span className="text-gold italic">answer?</span>
          </h2>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link to="/inquiry" className="bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all">
              Send an Inquiry
            </Link>
            <a
              href={whatsappLink("Hi Irha Apparels, I have a question about your B2B program.")}
              target="_blank"
              rel="noreferrer"
              className="border border-foreground/30 hover:border-primary hover:text-primary px-8 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
