import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";

const OUTPUT_PATH = resolve("public/catalog-route-manifest.json");
const EXPECTED_PRODUCTS = 254;

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

type ReleaseProduct = {
  id: string;
  slug: string;
  name: string;
  sku?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  short_description?: string | null;
  description?: string | null;
  image_url?: string | null;
  gallery?: string[] | null;
  updated_at?: string | null;
};

type ReleasePayload = { products: ReleaseProduct[] };
type TaxonomyNode = {
  id: string;
  parent_id: string | null;
  depth: number;
  slug: string;
  name: string;
  full_slug_path: string;
  updated_at?: string | null;
};
type TaxonomyAssignment = {
  product_id: string;
  product_slug: string;
  taxonomy_node_id: string;
  full_slug_path: string;
  canonical_path: string;
  approved_at?: string | null;
};
type TaxonomyPayload = { nodes: TaxonomyNode[]; assignments: TaxonomyAssignment[] };

async function fetchRpc<T>(name: string): Promise<T> {
  const response = await fetch(`${OWNER_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!response.ok) throw new Error(`Could not fetch ${name}: ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

function referenceCode(product: ReleaseProduct) {
  return product.sku?.match(/P\d{3}/i)?.[0]?.toUpperCase() ?? product.slug;
}

function newestTimestamp(values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  return valid.length ? valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0] : new Date(0).toISOString();
}

function safeProgramDescription(row: BuyerReadyCatalogRoute) {
  const product = row.product_name;
  switch (row.main_category_slug) {
    case "bavarian-trachten-wear":
      return `${product} custom manufacturing for Trachten retailers, wholesalers and private-label buyers. Material, embroidery, trims, sizing, packaging and order requirements are confirmed after buyer and factory review.`;
    case "premium-leather-apparel":
      return `${product} custom development for wholesale and private-label leather apparel programs. Leather type, construction, hardware, lining, fit, branding and packaging are confirmed against the approved buyer specification.`;
    case "sportswear":
      return `${product} custom development for teams, clubs, distributors and private-label sportswear buyers. Fabric, panel construction, sizing, decoration, colors, packaging and production requirements are confirmed after review.`;
    case "streetwear-activewear":
      return `${product} custom manufacturing for streetwear, activewear and private-label brand programs. Fabric, weight, fit, construction, decoration, labels, colors and packaging are confirmed against the buyer brief.`;
    case "leisure-nightwear":
      return `${product} custom manufacturing for leisurewear, loungewear, sleepwear and hospitality buyer programs. Fabric, comfort, fit, construction, trims, branding and packaging are confirmed after requirement review.`;
    default:
      return `${product} custom manufacturing within ${row.product_type_name} for wholesale, OEM, ODM and private-label buyers. Specifications are confirmed after buyer and factory review.`;
  }
}

function buyerSafeRow(row: BuyerReadyCatalogRoute): BuyerReadyCatalogRoute {
  const fallback = safeProgramDescription(row);
  return {
    ...row,
    seo_title: row.seo_title?.trim() || `${row.product_name} Wholesale Manufacturer | Sialkot Garment Factory`,
    seo_h1: row.product_name,
    seo_description: row.seo_description?.trim() || fallback,
    short_description: row.short_description?.trim() || fallback,
    product_description: row.product_description?.trim() || fallback,
  };
}

async function fetchManifest(): Promise<BuyerReadyCatalogRoute[]> {
  const [release, taxonomy] = await Promise.all([
    fetchRpc<ReleasePayload>("catalog_get_public_release"),
    fetchRpc<TaxonomyPayload>("catalog_get_public_taxonomy"),
  ]);
  if (!Array.isArray(release.products) || !Array.isArray(taxonomy.nodes) || !Array.isArray(taxonomy.assignments)) {
    throw new Error("Published catalogue APIs returned an invalid payload");
  }

  const productsById = new Map(release.products.map((product) => [product.id, product]));
  const nodesById = new Map(taxonomy.nodes.map((node) => [node.id, node]));
  const rows: BuyerReadyCatalogRoute[] = [];

  for (const assignment of taxonomy.assignments) {
    const product = productsById.get(assignment.product_id);
    const leaf = nodesById.get(assignment.taxonomy_node_id);
    const audience = leaf?.parent_id ? nodesById.get(leaf.parent_id) : undefined;
    const root = audience?.parent_id ? nodesById.get(audience.parent_id) : undefined;
    if (!product || !leaf || !audience || !root) {
      throw new Error(`Published taxonomy assignment cannot be resolved: ${assignment.product_id}`);
    }
    const gallery = Array.isArray(product.gallery) ? product.gallery.filter(Boolean) : [];
    const imageUrl = product.image_url ?? gallery[0] ?? "";
    rows.push({
      product_id: product.id,
      reference_code: referenceCode(product),
      product_slug: product.slug,
      product_name: product.name,
      canonical_path: assignment.canonical_path,
      main_category_slug: root.slug,
      main_category_name: root.name,
      audience_slug: audience.slug,
      audience_name: audience.name,
      product_type_slug: leaf.slug,
      product_type_name: leaf.name,
      seo_title: product.seo_title ?? null,
      seo_description: product.seo_description ?? null,
      seo_h1: product.name,
      short_description: product.short_description ?? null,
      product_description: product.description ?? null,
      image_url: imageUrl,
      gallery,
      updated_at: newestTimestamp([product.updated_at, assignment.approved_at, leaf.updated_at, audience.updated_at, root.updated_at]),
    });
  }

  return rows
    .map(buyerSafeRow)
    .sort((a, b) => a.reference_code.localeCompare(b.reference_code, undefined, { numeric: true }) || a.canonical_path.localeCompare(b.canonical_path));
}

function assertManifest(rows: BuyerReadyCatalogRoute[]) {
  if (rows.length !== EXPECTED_PRODUCTS) {
    throw new Error(`Buyer-ready manifest must contain ${EXPECTED_PRODUCTS} products; received ${rows.length}`);
  }
  const productIds = new Set<string>();
  const paths = new Set<string>();
  for (const row of rows) {
    const expectedPath = `/products/${row.main_category_slug}/${row.audience_slug}/${row.product_type_slug}/${row.product_slug}`;
    if (row.canonical_path !== expectedPath) throw new Error(`${row.reference_code} canonical mismatch: ${row.canonical_path} !== ${expectedPath}`);
    if (!row.image_url || !row.gallery.length) throw new Error(`${row.reference_code} is missing buyer-ready media`);
    if (row.gallery[0] !== row.image_url) throw new Error(`${row.reference_code} front image is not gallery slot 1`);
    if (!row.seo_title || row.seo_h1 !== row.product_name || !row.seo_description) {
      throw new Error(`${row.reference_code} runtime-parity metadata is incomplete`);
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
  writeFileSync(OUTPUT_PATH, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    productCount: rows.length,
    contentPolicy: "source-preserving-buyer-safe-fallbacks",
    products: rows,
  }, null, 2)}\n`);
  console.log(`Generated buyer-ready route manifest for ${rows.length} products with runtime-parity metadata`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
