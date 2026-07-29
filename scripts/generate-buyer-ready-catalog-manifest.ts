import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";
import {
  resolveBuyerReadyProductContent,
  type BuyerReadyFaq,
} from "../src/lib/buyerReadyProductContent";

const OUTPUT_PATH = resolve("public/catalog-route-manifest.json");
const QUERY_MAP_PATH = resolve("public/seo-query-to-url-map.json");
const EXPECTED_PRODUCTS = 254;
const TARGET_MARKETS = ["DE", "AT", "CH", "NL", "US", "UK", "CA", "AU"] as const;

const MEASURED_SEED_RESEARCH = [
  {
    query: "private label clothing manufacturer",
    language: "en",
    country: "US",
    intent: "commercial-b2b",
    estimatedMonthlyDemand: 880,
    seoDifficulty: 33,
    paidDifficulty: 33,
    cpcUsd: 5.73,
    bestTargetUrl: "https://irhaapparels.com/",
    serpFormat: "manufacturer service pages, supplier pages and buyer guides",
    relevantCompetitors: ["apliiq.com", "usaclothingmanufacturers.com", "bommestudio.com", "argusapparel.com"],
    conversionValue: "high",
  },
  {
    query: "custom sportswear manufacturer",
    language: "en",
    country: "US",
    intent: "commercial-b2b",
    estimatedMonthlyDemand: 590,
    seoDifficulty: 30,
    paidDifficulty: 1,
    cpcUsd: 6.82,
    bestTargetUrl: "https://irhaapparels.com/products/sportswear",
    serpFormat: "sportswear manufacturer and custom-program landing pages",
    relevantCompetitors: ["boathouse.com", "aktiksportswear.com", "argusapparel.com", "mfgmerch.com"],
    conversionValue: "high",
  },
  {
    query: "clothing manufacturer private label",
    language: "en",
    country: "UK",
    intent: "commercial-b2b",
    estimatedMonthlyDemand: 70,
    seoDifficulty: 29,
    paidDifficulty: 51,
    cpcUsd: 2.12,
    bestTargetUrl: "https://irhaapparels.com/",
    serpFormat: "manufacturer service pages and private-label process pages",
    relevantCompetitors: ["apliiq.com", "bommestudio.com", "tackapparel.com"],
    conversionValue: "high",
  },
  {
    query: "custom leather jacket manufacturer",
    language: "en",
    country: "CA",
    intent: "commercial-b2b",
    estimatedMonthlyDemand: 0,
    seoDifficulty: 4,
    paidDifficulty: 1,
    cpcUsd: 0,
    bestTargetUrl: "https://irhaapparels.com/custom-leather-jacket-manufacturer-canada",
    serpFormat: "product-manufacturer and market-specific sourcing pages",
    relevantCompetitors: [],
    conversionValue: "high",
  },
  {
    query: "streetwear manufacturer",
    language: "en",
    country: "AU",
    intent: "commercial-b2b",
    estimatedMonthlyDemand: 50,
    seoDifficulty: 20,
    paidDifficulty: 100,
    cpcUsd: 2.42,
    bestTargetUrl: "https://irhaapparels.com/products/streetwear-activewear",
    serpFormat: "streetwear manufacturer division and service pages",
    relevantCompetitors: [],
    conversionValue: "high",
  },
  {
    query: "Kledingfabrikant private label",
    language: "nl",
    country: "NL",
    intent: "commercial-b2b",
    estimatedMonthlyDemand: 0,
    seoDifficulty: 12,
    paidDifficulty: 1,
    cpcUsd: 0,
    bestTargetUrl: "https://irhaapparels.com/nl/private-label-kleding",
    serpFormat: "private-label clothing manufacturer landing pages",
    relevantCompetitors: [],
    conversionValue: "high",
  },
] as const;

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
  opening_answer: string;
  buyer_use_cases: string[];
  material_guidance: string;
  construction_guidance: string;
  customization_guidance: string;
  size_fit_guidance: string;
  sampling_steps: string[];
  packaging_logistics: string;
  moq_lead_time: string;
  decision_points: string[];
  buyer_faqs: BuyerReadyFaq[];
  primary_query: string;
  supporting_queries: string[];
  query_intent: "commercial-b2b";
  body_text: string;
  image_url: string;
  gallery: string[];
  updated_at: string;
  specs: string[];
  primary_material: string | null;
  fabric_composition: string | null;
  gsm: string | null;
  available_sizes: string[];
  available_colors: string[];
  customization: Record<string, boolean>;
  packaging_standard: string | null;
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
  specs?: string[] | null;
  primary_material?: string | null;
  fabric_composition?: string | null;
  gsm?: string | null;
  available_sizes?: string[] | null;
  available_colors?: string[] | null;
  customization?: Record<string, boolean> | null;
  packaging_standard?: string | null;
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

function buyerSafeRow(row: BuyerReadyCatalogRoute): BuyerReadyCatalogRoute {
  const content = resolveBuyerReadyProductContent({
    name: row.product_name,
    slug: row.product_slug,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    short_description: row.short_description,
    description: row.product_description,
    mainCategorySlug: row.main_category_slug,
    mainCategoryName: row.main_category_name,
    audienceSlug: row.audience_slug,
    audienceName: row.audience_name,
    productTypeSlug: row.product_type_slug,
    productTypeName: row.product_type_name,
    specs: row.specs,
    primary_material: row.primary_material,
    fabric_composition: row.fabric_composition,
    gsm: row.gsm,
    available_sizes: row.available_sizes,
    available_colors: row.available_colors,
    customization: row.customization,
    packaging_standard: row.packaging_standard,
  });
  return {
    ...row,
    product_name: content.name,
    seo_title: content.seoTitle,
    seo_h1: content.h1,
    seo_description: content.seoDescription,
    short_description: content.shortDescription,
    product_description: content.description,
    opening_answer: content.openingAnswer,
    buyer_use_cases: content.buyerUseCases,
    material_guidance: content.materialGuidance,
    construction_guidance: content.constructionGuidance,
    customization_guidance: content.customizationGuidance,
    size_fit_guidance: content.sizeAndFitGuidance,
    sampling_steps: content.samplingSteps,
    packaging_logistics: content.packagingAndLogistics,
    moq_lead_time: content.moqAndLeadTime,
    decision_points: content.decisionPoints,
    buyer_faqs: content.faqs,
    primary_query: content.queryCluster.primaryQuery,
    supporting_queries: content.queryCluster.supportingQueries,
    query_intent: content.queryCluster.intent,
    body_text: content.bodyText,
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
      opening_answer: "",
      buyer_use_cases: [],
      material_guidance: "",
      construction_guidance: "",
      customization_guidance: "",
      size_fit_guidance: "",
      sampling_steps: [],
      packaging_logistics: "",
      moq_lead_time: "",
      decision_points: [],
      buyer_faqs: [],
      primary_query: "",
      supporting_queries: [],
      query_intent: "commercial-b2b",
      body_text: "",
      image_url: imageUrl,
      gallery,
      updated_at: newestTimestamp([product.updated_at, assignment.approved_at, leaf.updated_at, audience.updated_at, root.updated_at]),
      specs: Array.isArray(product.specs) ? product.specs.filter(Boolean) : [],
      primary_material: product.primary_material ?? null,
      fabric_composition: product.fabric_composition ?? null,
      gsm: product.gsm ?? null,
      available_sizes: Array.isArray(product.available_sizes) ? product.available_sizes.filter(Boolean) : [],
      available_colors: Array.isArray(product.available_colors) ? product.available_colors.filter(Boolean) : [],
      customization: product.customization && typeof product.customization === "object" ? product.customization : {},
      packaging_standard: product.packaging_standard ?? null,
    });
  }

  return rows
    .map(buyerSafeRow)
    .sort((a, b) => a.reference_code.localeCompare(b.reference_code, undefined, { numeric: true }) || a.canonical_path.localeCompare(b.canonical_path));
}

const SEMANTIC_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "before", "by", "for", "from", "in", "is", "it",
  "of", "on", "or", "the", "this", "to", "with", "irha", "apparels", "buyer", "buyers", "approved",
  "custom", "manufacturing", "manufacturer", "program", "programs", "product", "requirements",
]);

function semanticTokens(row: BuyerReadyCatalogRoute) {
  const productTokens = new Set(
    `${row.product_name} ${row.product_slug}`.toLowerCase().match(/[a-z0-9]+/g) ?? [],
  );
  const words = (row.product_description?.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((token) => token.length > 2 && !SEMANTIC_STOP_WORDS.has(token) && !productTokens.has(token));
  return new Set(
    words.slice(0, -2).map((token, index) => `${token} ${words[index + 1]} ${words[index + 2]}`),
  );
}

function jaccard(left: Set<string>, right: Set<string>) {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 1;
}

function assertManifest(rows: BuyerReadyCatalogRoute[]) {
  if (rows.length !== EXPECTED_PRODUCTS) {
    throw new Error(`Buyer-ready manifest must contain ${EXPECTED_PRODUCTS} products; received ${rows.length}`);
  }
  const productIds = new Set<string>();
  const paths = new Set<string>();
  const primaryQueries = new Set<string>();
  const semantic = rows.map((row) => ({ row, tokens: semanticTokens(row) }));

  for (const row of rows) {
    const expectedPath = `/products/${row.main_category_slug}/${row.audience_slug}/${row.product_type_slug}/${row.product_slug}`;
    if (row.canonical_path !== expectedPath) throw new Error(`${row.reference_code} canonical mismatch: ${row.canonical_path} !== ${expectedPath}`);
    if (!row.image_url || !row.gallery.length) throw new Error(`${row.reference_code} is missing buyer-ready media`);
    if (row.gallery[0] !== row.image_url) throw new Error(`${row.reference_code} front image is not gallery slot 1`);
    if (!row.seo_title || row.seo_h1 !== row.product_name || !row.seo_description) {
      throw new Error(`${row.reference_code} runtime-parity metadata is incomplete`);
    }
    if (row.body_text.split(/\s+/).length < 180 || row.buyer_faqs.length < 2 || row.sampling_steps.length < 4) {
      throw new Error(`${row.reference_code} does not meet the product-specific buyer-content standard`);
    }
    if (!row.primary_query.toLowerCase().includes(row.product_name.toLowerCase()) || row.query_intent !== "commercial-b2b") {
      throw new Error(`${row.reference_code} has an invalid primary query cluster`);
    }
    if (/\blow[- ]moq\b|\bguaranteed\b|\bzero price\b/i.test(row.body_text)) {
      throw new Error(`${row.reference_code} contains an unsupported commercial promise`);
    }
    if (productIds.has(row.product_id)) throw new Error(`Duplicate manifest product: ${row.product_id}`);
    if (paths.has(row.canonical_path)) throw new Error(`Duplicate manifest path: ${row.canonical_path}`);
    if (primaryQueries.has(row.primary_query.toLowerCase())) throw new Error(`Duplicate primary query: ${row.primary_query}`);
    productIds.add(row.product_id);
    paths.add(row.canonical_path);
    primaryQueries.add(row.primary_query.toLowerCase());
  }

  for (let left = 0; left < semantic.length; left += 1) {
    for (let right = left + 1; right < semantic.length; right += 1) {
      const similarity = jaccard(semantic[left].tokens, semantic[right].tokens);
      if (similarity >= 0.92) {
        throw new Error(
          `Materially duplicated product descriptions: ${semantic[left].row.reference_code} and ${semantic[right].row.reference_code} (${similarity.toFixed(3)})`,
        );
      }
    }
  }
}

function writeQueryMap(rows: BuyerReadyCatalogRoute[], generatedAt: string) {
  writeFileSync(QUERY_MAP_PATH, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt,
    policy: {
      mapping: "one-primary-commercial-query-cluster-to-one-canonical-product-url",
      demandData: "External demand metrics are maintained separately and must never be fabricated.",
      localization: "Only complete, naturally reviewed translations may become indexable.",
    },
    researchSnapshot: {
      measuredAt: "2026-07-30",
      source: "Ubersuggest live keyword ideas plus current Google-result page-type review",
      caveat: "A zero is the provider's reported value for this snapshot, not proof that no searches occur.",
      measuredSeedResearch: MEASURED_SEED_RESEARCH,
    },
    productCount: rows.length,
    mappings: rows.map((row) => ({
      referenceCode: row.reference_code,
      productName: row.product_name,
      language: "en",
      targetCountries: TARGET_MARKETS,
      intent: row.query_intent,
      primaryQuery: row.primary_query,
      supportingQueries: row.supporting_queries,
      estimatedDemand: null,
      competitionDifficulty: null,
      currentRankingUrl: null,
      bestTargetUrl: `https://irhaapparels.com${row.canonical_path}`,
      canonicalPath: row.canonical_path,
      serpFormat: "individual product-manufacturer landing page",
      relevantCompetitors: [],
      conversionValue: "high",
      measurementStatus: "exact product cluster requires Search Console or expanded paid-tool data",
      division: row.main_category_name,
      audience: row.audience_name,
      productType: row.product_type_name,
      conversionPath: `https://irhaapparels.com/inquiry?intent=rfq&product=${encodeURIComponent(row.product_slug)}&code=${encodeURIComponent(row.reference_code)}`,
    })),
  }, null, 2)}\n`);
}

async function main() {
  const rows = await fetchManifest();
  assertManifest(rows);
  const generatedAt = new Date().toISOString();
  writeFileSync(OUTPUT_PATH, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt,
    productCount: rows.length,
    contentPolicy: "shared-product-specific-buyer-content-with-truthful-order-qualification",
    products: rows,
  }, null, 2)}\n`);
  writeQueryMap(rows, generatedAt);
  console.log(`Generated buyer-ready route manifest and exact query map for ${rows.length} products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
