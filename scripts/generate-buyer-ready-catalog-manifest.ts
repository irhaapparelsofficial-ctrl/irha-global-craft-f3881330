import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";

const OUTPUT_PATH = resolve("public/catalog-route-manifest.json");
const EXPECTED_PRODUCTS = 254;
const PAGE_SIZE = 1000;

export type BuyerReadyCatalogRoute = {
  product_id: string;
  reference_code: string;
  product_slug: string;
  product_name: string;
  canonical_path: string;
  main_category_slug: string;
  main_category_name: string;
  audience_slug: string;
  audience_name: string;
  product_type_slug: string;
  product_type_name: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_h1: string | null;
  short_description: string | null;
  product_description: string | null;
  image_url: string;
  gallery: string[];
  updated_at: string;
};

async function fetchManifest(): Promise<BuyerReadyCatalogRoute[]> {
  const rows: BuyerReadyCatalogRoute[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(
      `${OWNER_SUPABASE_URL}/rest/v1/rpc/get_public_catalog_route_manifest`,
      {
        method: "POST",
        headers: {
          apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
          Range: `${offset}-${offset + PAGE_SIZE - 1}`,
          "Range-Unit": "items",
        },
        body: "{}",
      },
    );
    if (!response.ok) {
      throw new Error(`Could not fetch buyer-ready catalogue manifest: ${response.status} ${await response.text()}`);
    }
    const page = (await response.json()) as BuyerReadyCatalogRoute[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function assertManifest(rows: BuyerReadyCatalogRoute[]) {
  if (rows.length !== EXPECTED_PRODUCTS) {
    throw new Error(`Buyer-ready manifest must contain ${EXPECTED_PRODUCTS} products; received ${rows.length}`);
  }

  const productIds = new Set<string>();
  const paths = new Set<string>();
  for (const row of rows) {
    const expectedPath = `/products/${row.main_category_slug}/${row.audience_slug}/${row.product_type_slug}/${row.product_slug}`;
    if (row.canonical_path !== expectedPath) {
      throw new Error(`${row.reference_code} canonical mismatch: ${row.canonical_path} !== ${expectedPath}`);
    }
    if (!row.image_url || !Array.isArray(row.gallery) || row.gallery.length === 0) {
      throw new Error(`${row.reference_code} is missing buyer-ready media`);
    }
    if (row.gallery[0] !== row.image_url) {
      throw new Error(`${row.reference_code} front image is not gallery slot 1`);
    }
    if (productIds.has(row.product_id)) throw new Error(`Duplicate manifest product: ${row.product_id}`);
    if (paths.has(row.canonical_path)) throw new Error(`Duplicate manifest path: ${row.canonical_path}`);
    productIds.add(row.product_id);
    paths.add(row.canonical_path);
  }
}

async function main() {
  const rows = await fetchManifest();
  assertManifest(rows);
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    productCount: rows.length,
    products: rows,
  };
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Generated buyer-ready route manifest for ${rows.length} products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
