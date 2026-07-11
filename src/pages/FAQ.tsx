import SEO from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { whatsappLink } from "@/lib/constants";

const FAQS = [
  {
    group: "Company & Verification",
    items: [
      {
        q: "Is Irha Apparels a new manufacturer?",
        a: "No. Irha Apparels is an experienced apparel manufacturer in Sialkot. The website is newly built, so buyers are encouraged to verify the team and program directly instead of relying on website age alone.",
      },
      {
        q: "Can I see the factory before placing an order?",
        a: "You can request a scheduled live factory video call. The team confirms availability and the relevant viewing scope after reviewing your category and meeting request.",
      },
      {
        q: "How can my company verify Irha Apparels?",
        a: "Share your business requirement, request a live call, review the quotation and program evidence, and confirm specifications, samples and commercial terms before committing to production.",
      },
    ],
  },
  {
    group: "Quotes & MOQ",
    items: [
      {
        q: "What is your minimum order quantity?",
        a: "MOQ is confirmed per program. It depends on the product, material, color split, customization, labels, packaging and production setup. Send the exact requirement for a reliable answer.",
      },
      {
        q: "Why are prices not shown on the website?",
        a: "Irha Apparels is a custom B2B manufacturer, not a fixed-price retail store. Unit cost changes with fabric or leather, construction, embellishment, quantity, packaging, destination and shipping scope.",
      },
      {
        q: "What information is needed for a quotation?",
        a: "Provide the product or reference, material preference, estimated quantity, size and color range, customization, branding, destination country and target delivery window. A tech pack is helpful but not required for the first review.",
      },
    ],
  },
  {
    group: "Samples & Development",
    items: [
      {
        q: "Can I request a sample before bulk production?",
        a: "Yes, sample requests can be reviewed before bulk production. Sample feasibility, cost, timing and shipping are confirmed after the product and customization scope are understood.",
      },
      {
        q: "Can you develop a product from a sketch or reference image?",
        a: "OEM, ODM and private-label development can start from a tech pack, sketch, reference garment or image. The team first confirms what can be developed without copying protected branding or unsupported details.",
      },
      {
        q: "What happens if I request changes after sample approval?",
        a: "Changes are documented and reviewed again because they may affect material use, pattern, artwork, cost or timing. Bulk should proceed only against the latest approved specification.",
      },
    ],
  },
  {
    group: "Customization & Private Label",
    items: [
      {
        q: "What private-label options are available?",
        a: "Depending on the program, options may include woven or printed labels, care labels, hangtags, packaging, embroidery, printing, trims and other buyer branding. Availability and MOQ are confirmed for the exact request.",
      },
      {
        q: "Can you match my colors, fabric or trims?",
        a: "Color, material and trim matching can be reviewed against references or specifications. Approval samples, swatches or alternatives may be required before bulk production.",
      },
      {
        q: "Can we discuss confidentiality or an NDA?",
        a: "Yes. Tell the team about confidentiality, design ownership or exclusivity requirements before sharing sensitive files so the appropriate commercial terms can be discussed.",
      },
    ],
  },
  {
    group: "Quality & Documentation",
    items: [
      {
        q: "How is product quality agreed?",
        a: "Quality is judged against the approved specification, sample, measurements, materials, artwork, trims and packaging requirements. The inspection plan should be agreed before production.",
      },
      {
        q: "Do all products carry the same certifications?",
        a: "No blanket certification claim is made for every product. Material, testing and compliance documents are confirmed according to the exact fabric or leather, supplier, destination and buyer requirement.",
      },
      {
        q: "Can third-party inspection be arranged?",
        a: "Third-party inspection requirements can be discussed and included in the order plan before production. The inspection scope, timing, cost and responsible party must be agreed in writing.",
      },
    ],
  },
  {
    group: "Production, Shipping & Payment",
    items: [
      {
        q: "How long will production take?",
        a: "Timing is confirmed after the product, quantity, material availability, sample approval and customization are reviewed. A date shown before that review would not be reliable.",
      },
      {
        q: "Which shipping terms are available?",
        a: "The team can review suitable Incoterms and shipping options based on destination, shipment size and buyer preference. The quotation states what is included and which destination costs remain with the buyer.",
      },
      {
        q: "What payment terms do you accept?",
        a: "Payment method and milestones are stated on the approved quotation or proforma invoice. Do not send payment against an informal message that does not match the confirmed company and order documents.",
      },
    ],
  },
];

export default function FAQ() {
  return (
    <>
      <SEO
        title="B2B Buyer FAQ — Quotes, Samples, MOQ & Verification"
        description="Buyer-safe answers about Irha Apparels verification, custom quotations, MOQ, samples, private label, quality documents, production, shipping and payment."
        path="/faq"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.flatMap((group) =>
            group.items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          ),
        }}
      />

      <section className="pt-36 md:pt-44 pb-20 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-5">B2B Buyer FAQ</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.96] max-w-5xl">
            Clear answers before you <span className="text-gold italic">request a quote.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-base md:text-lg text-foreground/70 leading-relaxed">
            These answers explain the working approach. Exact MOQ, price, sample cost, production timing, documents and shipping are confirmed only after the specific program is reviewed.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe grid lg:grid-cols-12 gap-14">
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-32 space-y-3">
              <p className="eyebrow mb-4">Browse</p>
              {FAQS.map((group) => (
                <a
                  key={group.group}
                  href={`#${group.group.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  className="block text-sm text-foreground/68 hover:text-gold w-fit"
                >
                  {group.group}
                </a>
              ))}
              <Link to="/buyer-trust" className="mt-7 inline-flex text-[10px] uppercase tracking-[0.2em] text-gold hover:underline">
                Open Buyer Trust Center
              </Link>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-14">
            {FAQS.map((group) => (
              <div key={group.group} id={group.group.toLowerCase().replace(/[^a-z]+/g, "-")} className="scroll-mt-32">
                <p className="eyebrow mb-5">{group.group}</p>
                <Accordion type="single" collapsible className="space-y-3">
                  {group.items.map((item, index) => (
                    <AccordionItem
                      key={item.q}
                      value={`${group.group}-${index}`}
                      className="border border-border/60 bg-card/35 px-6 data-[state=open]:border-gold/45 transition-colors"
                    >
                      <AccordionTrigger className="font-display text-lg md:text-xl text-left hover:no-underline py-6">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-foreground/70 leading-relaxed text-sm md:text-base pb-6">
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

      <section className="py-24 border-t border-border/60 bg-secondary/35">
        <div className="container-luxe text-center max-w-4xl">
          <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
            Need an answer for your <span className="text-gold italic">exact program?</span>
          </h2>
          <div className="mt-9 flex flex-wrap gap-3 justify-center">
            <Link to="/inquiry" className="bg-gradient-gold text-primary-foreground px-8 py-4 text-[10px] uppercase tracking-[0.24em]">
              Send an inquiry
            </Link>
            <Link to="/factory-video-call" className="border border-foreground/25 hover:border-gold hover:text-gold px-8 py-4 text-[10px] uppercase tracking-[0.24em]">
              Request factory call
            </Link>
            <a
              href={whatsappLink("Hi Irha Apparels, I have a question about a B2B manufacturing program.")}
              target="_blank"
              rel="noreferrer noopener"
              className="border border-foreground/25 hover:border-emerald-400 hover:text-emerald-300 px-8 py-4 text-[10px] uppercase tracking-[0.24em]"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
