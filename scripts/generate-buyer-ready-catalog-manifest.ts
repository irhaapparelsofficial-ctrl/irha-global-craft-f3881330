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

type ReleasePayload = {
  products: ReleaseProduct[];
};

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

type TaxonomyPayload = {
  nodes: TaxonomyNode[];
  assignments: TaxonomyAssignment[];
};

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
  if (!response.ok) {
    throw new Error(`Could not fetch ${name}: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

function referenceCode(product: ReleaseProduct) {
  const match = product.sku?.match(/P\d{3}/i)?.[0];
  return match?.toUpperCase() ?? product.slug;
}

function newestTimestamp(values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (!valid.length) return new Date(0).toISOString();
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
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
      seo_h1: null,
      short_description: product.short_description ?? null,
      product_description: product.description ?? null,
      image_url: imageUrl,
      gallery,
      updated_at: newestTimestamp([
        product.updated_at,
        assignment.approved_at,
        leaf.updated_at,
        audience.updated_at,
        root.updated_at,
      ]),
    });
  }

  return rows.sort((a, b) =>
    a.reference_code.localeCompare(b.reference_code, undefined, { numeric: true })
    || a.canonical_path.localeCompare(b.canonical_path),
  );
}

function safeProgramDescription(row: BuyerReadyCatalogRoute) {
  const product = row.product_name;
  const type = row.product_type_name;
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
      return `${product} custom manufacturing within ${type} for wholesale, OEM, ODM and private-label buyers. Specifications are confirmed after buyer and factory review.`;
  }
}

function buyerSafeRow(row: BuyerReadyCatalogRoute): BuyerReadyCatalogRoute {
  const description = safeProgramDescription(row);
  return {
    ...row,
    seo_title: `${row.product_name} Manufacturer | Irha Apparels`,
    seo_h1: `Custom ${row.product_name} Manufacturing`,
    seo_description: description,
    short_description: description,
    product_description: description,
  };
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
  const rawRows = await fetchManifest();
  assertManifest(rawRows);
  const rows = rawRows.map(buyerSafeRow);
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    productCount: rows.length,
    contentPolicy: "buyer-safe-unverified-specifications",
    products: rows,
  };
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Generated buyer-ready route manifest for ${rows.length} products with category-safe content`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
