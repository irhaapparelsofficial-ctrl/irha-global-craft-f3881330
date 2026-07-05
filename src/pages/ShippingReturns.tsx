import { Helmet } from "react-helmet-async";

export default function ShippingReturns() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Helmet>
        <title>Shipping & Returns — FOB Sialkot Terms | Irha Apparels</title>
        <meta
          name="description"
          content="FOB Sialkot shipping terms, Incoterms, lead times, packing, claims, and return policy for B2B orders from Irha Apparels Pakistan."
        />
        <link rel="canonical" href="https://www.irhaapparels.com/shipping-returns" />
      </Helmet>

      <h1 className="mb-2 text-3xl font-semibold">Shipping &amp; Returns</h1>
      <p className="mb-8 text-sm text-foreground/60">
        FOB Sialkot terms for international B2B orders. Last updated: June 2026.
      </p>

      <div className="prose prose-neutral max-w-none space-y-5 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">1. Our default Incoterm — FOB Sialkot</h2>
          <p>
            Our standard price is <strong>FOB Sialkot (Incoterms 2020)</strong>. This means:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We deliver the goods, cleared for export, on board the vessel or aircraft at Sialkot.</li>
            <li>Risk and ownership pass to the buyer once the goods are on board.</li>
            <li>Ocean freight, insurance, import duty, customs clearance, and last-mile delivery are paid by the buyer.</li>
          </ul>
          <p>
            On request we can also quote <strong>EXW Sialkot</strong>, <strong>CIF</strong> (your sea port),
            <strong> CPT</strong>, or <strong>DAP</strong> (your door, by air). Each Incoterm changes the price and the responsibility.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Shipping modes and time</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Air freight</strong> (DHL / FedEx / UPS / Emirates SkyCargo) — 4 to 8 days door-to-door.</li>
            <li><strong>Sea freight (FCL / LCL)</strong> — 25 to 40 days from Karachi to most ports in EU, UK, USA, Canada, Australia.</li>
            <li><strong>Express samples</strong> — 3 to 5 working days worldwide.</li>
          </ul>
          <p>Transit time starts the day the goods leave Sialkot.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Packing and labelling</h2>
          <p>
            Each piece is poly-bagged. Pieces are packed in solid export cartons (5-ply) with
            shipping marks, carton number, color, size ratio, and net/gross weight. Hang tags,
            care labels, barcode stickers, and custom inner packaging are available on request.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Documents we provide</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Commercial Invoice</li>
            <li>Packing List</li>
            <li>Certificate of Origin (Pakistan)</li>
            <li>Bill of Lading or Air Waybill</li>
            <li>Form E (Pakistan State Bank export form)</li>
            <li>GSP+ / EUR.1 form for EU buyers (when eligible)</li>
            <li>certified / audit-on-request / test reports on request (where applicable)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Customs, duty, and taxes</h2>
          <p>
            Import duty, VAT, GST, and customs clearance in the destination country are paid by
            the buyer. Buyers in the EU can often use Pakistan&apos;s <strong>GSP+ status</strong> to
            import at 0% duty for many HS codes — we provide the EUR.1 form free of charge.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Insurance</h2>
          <p>
            Under FOB, cargo insurance is the buyer&apos;s responsibility. We strongly recommend
            insuring the shipment for 110% of invoice value. We can arrange insurance on request
            and add the cost to the invoice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Inspection</h2>
          <p>
            You may inspect goods at our factory before shipment, in person or through a third
            party (SGS, Intertek, Bureau Veritas, AQF). Inspection cost is paid by the buyer.
            Once inspection is signed off, the goods are accepted as approved.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Returns and claims</h2>
          <p>
            Custom-made apparel is non-returnable, because every order is produced to the buyer&apos;s
            artwork, sizes, and specs. However, we will repair, remake, or refund if:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The goods do not match the approved pre-production sample, or</li>
            <li>There is a workmanship defect above the standard 2.5% AQL tolerance, or</li>
            <li>The shipped quantity is short of the invoiced quantity.</li>
          </ul>
          <p>
            Claims must be sent within <strong>14 days</strong> of arrival, with photos, video,
            the carton number, and the affected piece count. We reply within 3 working days with
            a resolution: free replacement in the next order, credit note, or partial refund.
            Shipping the goods back is usually not needed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Damage in transit</h2>
          <p>
            Once the goods are on board, risk is with the buyer (FOB) or with the carrier (CIF /
            DAP). Damage during shipping must be claimed with the carrier and the insurance
            company, not with Irha Apparels. We help with the paperwork.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Contact for shipping</h2>
          <p>
            Export desk:{" "}
            <a className="underline" href="mailto:irhaapparelsofficial@gmail.com">
              irhaapparelsofficial@gmail.com
            </a>{" "}
            · WhatsApp +92 320 4110066 · Sialkot, Pakistan.
          </p>
        </section>
      </div>
    </main>
  );
}
