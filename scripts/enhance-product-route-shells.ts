import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
import { relatedCandidates } from "./related-product-policy";

const DIST = resolve("dist");
const MANIFEST = join(DIST, "catalog-route-manifest.json");
const EXPECTED_PRODUCTS = 254;

type Payload = { schemaVersion: number; productCount: number; products: BuyerReadyCatalogRoute[] };

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function relatedSection(product: BuyerReadyCatalogRoute, related: BuyerReadyCatalogRoute[]) {
  return `<section data-irha-related-products="true" aria-labelledby="related-products" style="max-width:1120px;margin:0 auto;padding:0 24px 64px">
      <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Related canonical products</p>
      <h2 id="related-products" style="margin:0 0 18px;font-size:28px">More ${escapeHtml(product.main_category_name)} products</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px">
        ${related.map((item) => `<a href="${item.canonical_path}" style="display:block;border:1px solid #2e2a25;background:#111;color:#f5f1e8;padding:16px;text-decoration:none"><strong>${escapeHtml(item.product_name)}</strong><br><span style="color:#bdb5aa;font-size:13px">${escapeHtml(item.reference_code)} · View product</span></a>`).join("\n        ")}
      </div>
    </section>`;
}

async function main() {
  const payload = JSON.parse(await readFile(MANIFEST, "utf8")) as Payload;
  if (payload.schemaVersion !== 1 || payload.productCount !== EXPECTED_PRODUCTS || payload.products.length !== EXPECTED_PRODUCTS) {
    throw new Error("Related product shell enhancement requires the complete 254-product manifest");
  }

  let enhanced = 0;
  for (const product of payload.products) {
    const related = relatedCandidates(payload.products, product);
    if (!related.length) throw new Error(`No related canonical product available for ${product.reference_code}`);

    const file = join(DIST, product.canonical_path.slice(1), "index.html");
    let html = await readFile(file, "utf8");
    if (!html.includes('data-irha-product-shell="true"')) throw new Error(`${product.reference_code} product-specific shell is missing before related-link enhancement`);
    if (html.includes('data-irha-related-products="true"')) throw new Error(`${product.reference_code} already contains duplicate related-product markup`);
    html = html.replace("</main>", `</main>\n    ${relatedSection(product, related)}`);
    for (const item of related) {
      if (!html.includes(`href="${item.canonical_path}"`)) throw new Error(`${product.reference_code} related canonical link missing: ${item.canonical_path}`);
    }
    await writeFile(file, html, "utf8");
    enhanced += 1;
  }
  if (enhanced !== EXPECTED_PRODUCTS) throw new Error(`Expected ${EXPECTED_PRODUCTS} enhanced product shells; received ${enhanced}`);
  console.log(`Added deterministic canonical related-product links to ${enhanced} product crawler shells`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
