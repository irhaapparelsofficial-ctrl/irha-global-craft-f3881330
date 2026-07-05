import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { usePublicProduct } from "@/hooks/usePublicCatalog";
import { resolveGallery } from "@/lib/assetResolver";
import SEO from "@/components/SEO";
import { Printer, ArrowLeft } from "lucide-react";

/**
 * Print-friendly product specification sheet.
 * Uses the browser's native print dialog — no PDF server needed.
 * Route: /products/:categorySlug/:productSlug/spec-sheet
 */
export default function ProductSpecSheet() {
  const { categorySlug, productSlug } = useParams<{ categorySlug: string; productSlug: string }>();
  const { data, isLoading, error } = usePublicProduct(categorySlug, productSlug);

  useEffect(() => {
    document.body.classList.add("print-spec-sheet");
    return () => document.body.classList.remove("print-spec-sheet");
  }, []);

  if (isLoading) {
    return <div className="pt-40 pb-20 container-luxe text-sm text-muted-foreground">Loading…</div>;
  }
  if (error || !data) {
    return <Navigate to={`/products/${categorySlug ?? ""}`} replace />;
  }

  const { product, subCategory, topCategory } = data;
  const cover = resolveGallery(product.gallery.length ? product.gallery : [product.image_url ?? ""])[0];

  const rows: Array<[string, string | null | undefined]> = [
    ["SKU", product.sku],
    ["Category", `${topCategory.name} · ${subCategory.name}`],
    ["MOQ", product.moq_display],
    ["Sample Availability", product.sample_timeline ?? (product.sample_available === false ? "Not available" : null)],
    ["Production Timeline", product.production_timeline],
    ["Primary Material", product.primary_material],
    ["Fabric Composition", product.fabric_composition],
    ["Weight / GSM", product.gsm],
    ["Sizes", product.available_sizes?.length ? product.available_sizes.join(", ") : null],
    ["Colors", product.available_colors?.length ? product.available_colors.join(", ") : null],
    ["Custom Colors", product.custom_colors ? "Available on request" : null],
    ["Packaging", product.packaging_standard],
    ["Custom Packaging", product.packaging_custom ? "Available" : null],
    ["Country of Origin", product.country_of_origin ?? "Pakistan (Sialkot)"],
  ];

  const custom = product.customization ?? {};
  const customEnabled = Object.entries(custom)
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/_/g, " "));

  const legacyDetails = (product.details ?? []).filter(
    (d) => !/(moq|lead time)/i.test(d.label),
  );

  return (
    <>
      <SEO
        title={`${product.name} — Specification Sheet | Irha Apparels`}
        description={(product.short_description ?? product.description ?? "").slice(0, 158)}
        path={`/products/${topCategory.slug}/${product.slug}/spec-sheet`}
        type="article"
      />
      <style>{`
        @media print {
          body.print-spec-sheet .no-print { display: none !important; }
          body.print-spec-sheet { background: white !important; color: black !important; }
          body.print-spec-sheet .spec-sheet { color: black !important; }
          body.print-spec-sheet .spec-sheet * { color: black !important; border-color: #ccc !important; }
          body.print-spec-sheet .spec-sheet .sheet-page { break-after: page; }
          @page { margin: 12mm; }
        }
      `}</style>

      <div className="no-print pt-28 pb-4 bg-background border-b border-border/60">
        <div className="container-luxe flex items-center justify-between flex-wrap gap-3">
          <Link to={`/products/${topCategory.slug}/${product.slug}`} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-foreground/70 hover:text-primary">
            <ArrowLeft size={14} /> Back to product
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-3 text-xs uppercase tracking-[0.25em]"
          >
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="spec-sheet bg-background py-10 print:py-0">
        <div className="container-luxe max-w-4xl">
          <header className="flex items-start justify-between border-b border-border/60 pb-6 mb-8">
            <div>
              <p className="eyebrow">Irha Apparels · Manufacturing Specification</p>
              <h1 className="font-display text-3xl md:text-4xl mt-2">{product.name}</h1>
              <p className="mt-2 text-sm text-foreground/70">{topCategory.name} · {subCategory.name}</p>
            </div>
            <div className="text-right text-[10px] uppercase tracking-[0.25em] text-foreground/60">
              <p>Sialkot · Pakistan</p>
              <p className="mt-1">irhaapparels.com</p>
            </div>
          </header>

          {cover && (
            <div className="mb-8">
              <img src={cover} alt={product.name} className="w-full max-h-[380px] object-cover border border-border/60" />
            </div>
          )}

          {(product.short_description ?? product.description) && (
            <section className="mb-8">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {product.short_description ?? product.description}
              </p>
            </section>
          )}

          <section className="mb-8">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-foreground/60 mb-4">Specifications</h2>
            <dl className="divide-y divide-border/60 border-y border-border/60">
              {rows
                .filter(([, v]) => v && String(v).trim())
                .map(([label, value]) => (
                  <div key={label} className="grid grid-cols-3 gap-4 py-2.5">
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-foreground/60">{label}</dt>
                    <dd className="col-span-2 text-sm text-foreground/90">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {customEnabled.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-foreground/60 mb-4">Customization Available</h2>
              <ul className="flex flex-wrap gap-2">
                {customEnabled.map((c) => (
                  <li key={c} className="inline-flex px-3 py-1.5 border border-border/60 text-[11px] uppercase tracking-[0.2em] capitalize">
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {legacyDetails.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-foreground/60 mb-4">Additional Notes</h2>
              <dl className="divide-y divide-border/60 border-y border-border/60">
                {legacyDetails.map((d, i) => (
                  <div key={i} className="grid grid-cols-3 gap-4 py-2.5">
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-foreground/60">{d.label}</dt>
                    <dd className="col-span-2 text-sm text-foreground/90">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <footer className="mt-10 pt-6 border-t border-border/60 text-xs text-foreground/70">
            <p className="font-medium">Pricing is quotation-based. Please contact us for a formal quote.</p>
            <p className="mt-2">
              Request a quote → <span className="text-foreground/90">irhaapparels.com/inquiry</span>
              <br />
              WhatsApp / Email · Sialkot, Pakistan
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
