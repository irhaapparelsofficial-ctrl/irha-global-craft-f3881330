import { Helmet } from "react-helmet-async";

export default function TermsOfService() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Helmet>
        <title>Terms of Service — Irha Apparels</title>
        <meta
          name="description"
          content="B2B terms of service for Irha Apparels: orders, MOQ, production, payment, IP, warranties, and dispute resolution."
        />
        <link rel="canonical" href="https://www.irhaapparels.com/terms-of-service" />
      </Helmet>

      <h1 className="mb-2 text-3xl font-semibold">Terms of Service</h1>
      <p className="mb-8 text-sm text-foreground/60">
        Last updated: June 2026. These terms apply to all B2B orders placed with Irha Apparels.
      </p>

      <div className="prose prose-neutral max-w-none space-y-5 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">1. Who we are</h2>
          <p>
            Irha Apparels is a B2B garment manufacturer based in Sialkot, Pakistan. We sell only to
            registered businesses, brands, importers, and resellers. We do not sell to consumers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Quotes and orders</h2>
          <p>
            All quotes are valid for 14 days unless stated otherwise. An order is confirmed only
            after we send a Pro Forma Invoice (PI) and receive your signed approval plus the agreed
            deposit. Prices on the website are indicative; the final price is the one written on
            the PI.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Minimum order quantity (MOQ)</h2>
          <p>
            Our standard MOQ is 50 pieces per style, per color. Some product groups have a higher
            MOQ. The MOQ for your order is the one written on the PI.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Payment terms</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>50% advance deposit before production starts.</li>
            <li>50% balance before shipment / before the Bill of Lading is released.</li>
            <li>Payment by bank wire (T/T) in USD or EUR. L/C at sight is accepted for orders above USD 20,000.</li>
            <li>All bank charges on the buyer side are paid by the buyer.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Production time</h2>
          <p>
            Standard production is 30 to 45 days after deposit and sample approval. Larger or
            complex orders may take longer; the exact lead time is written on the PI.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Samples</h2>
          <p>
            Pre-production samples are charged at sample rate plus courier. Sample cost may be
            credited against the bulk order at our discretion. Bulk production starts only after
            you approve the sample in writing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Quality and tolerances</h2>
          <p>
            We follow standard apparel tolerances: measurements ±1 cm on small parts and ±2 cm on
            length, weight ±5%, and color ±5% against the approved lab dip. Claims must be raised
            within 14 days of receiving the goods, with photos and the affected piece count.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Intellectual property</h2>
          <p>
            You keep all rights to your brand, logos, artwork, tech packs, and designs. We will not
            sell, copy, or show your designs to other customers. You confirm you own (or are
            licensed to use) the artwork you send us, and you protect us against any third-party
            claim about that artwork.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Confidentiality</h2>
          <p>
            Both sides agree to keep prices, designs, and order details confidential. A separate
            NDA can be signed on request.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Force majeure</h2>
          <p>
            We are not responsible for delays caused by events outside our control, such as port
            strikes, customs delays, power outages, war, fire, flood, or government action. We
            will inform you as soon as possible and agree a new shipment date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Limitation of liability</h2>
          <p>
            Our maximum liability for any order is limited to the invoice value of that order. We
            are not liable for indirect losses such as lost profit, lost sales, or lost
            customers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">12. Governing law and disputes</h2>
          <p>
            These terms are governed by the laws of Pakistan. The parties will first try to solve
            any dispute by friendly talks. If that fails, the dispute will be settled by
            arbitration in Sialkot, Pakistan, under the Arbitration Act 1940.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">13. Contact</h2>
          <p>
            Questions about these terms?{" "}
            <a className="underline" href="mailto:irhaapparelsofficial@gmail.com">
              irhaapparelsofficial@gmail.com
            </a>{" "}
            · WhatsApp +92 320 4110066
          </p>
        </section>
      </div>
    </main>
  );
}
