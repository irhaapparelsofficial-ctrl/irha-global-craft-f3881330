// Buyer-facing catalogue data must come from a complete approved production release.
// No local, supplemental, demo or legacy catalogue is allowed to render publicly.
// Live RPC data is preferred; the build-generated verified manifest is the only runtime fallback.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbCategory, DbProduct, ProductDetailSpec } from "./useCatalog";
import type { Product as LegacyProduct } from "@/lib/categories";
import { resolveBuyerReadyProductContent } from "@/lib/buyerReadyProductContent";

export type PublicSubCategory = DbCategory & { products: DbProduct[] };
export type PublicTopCategory = DbCategory & {
  subs: PublicSubCategory[];
  directProducts: DbProduct[];
};

export type ReleaseProduct = DbProduct & {
  category_slug?: string | null;
  parent_slug?: string | null;
  updated_at?: string;
};

export type CatalogRelease = {
  products: ReleaseProduct[];
  releasedAt: string | null;
};

export type TaxonomyNode = {
  id: string;
  parent_id: string | null;
  node_type: string;
  slug: string;
  name: string;
  depth: number;
  full_slug_path: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  updated_at?: string;
};

export type TaxonomyAssignment = {
  product_id: string;
  product_slug: string;
  taxonomy_node_id: string;
  full_slug_path: string;
  canonical_path: string;
  approved_at: string;
};

export type TaxonomyRelease = {
  nodes: TaxonomyNode[];
  assignments: TaxonomyAssignment[];
};

type ManifestProduct = {
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

export type CatalogRouteManifest = {
  schemaVersion: number;
  generatedAt: string;
  productCount: number;
  contentPolicy: string;
  products: ManifestProduct[];
};

type RpcResult = { data: unknown; error: { message?: string } | null };

type LoadPublicCatalogOptions = {
  rpc: (name: string) => Promise<RpcResult>;
  fetchImpl?: typeof fetch;
  snapshotUrl?: string;
  report?: (error: Error) => void;
};

export const EXPECTED_PUBLIC_ROOTS = 5;
export const EXPECTED_PUBLISHED_PRODUCTS = 254;
export const EXPECTED_PUBLISHED_TAXONOMY_ROUTES = 105;

const K = {
  tree: ["public-catalog", "buyer-ready-taxonomy-v4"] as const,
  product: (category: string, product: string) =>
    ["public-catalog", "buyer-ready-product-v4", category, product] as const,
};

const ROOT_ORDER = [
  "bavarian-trachten-wear",
  "premium-leather-apparel",
  "sportswear",
  "streetwear-activewear",
  "leisure-nightwear",
] as const;

const BLOCKED_PUBLIC_TERMS = [
  "moq",
  "lead time",
  "production timeline",
  "sample timeline",
  "shipping time",
  "delivery time",
  "oeko",
  "bsci",
  "sedex",
  "iso 9001",
  "gots",
  "wrap",
  "reach",
  "ddp",
  "fob",
  "weekly shipment",
  "container load",
];

function integrityError(code: string, message: string): Error {
  return new Error(`[public-catalog:${code}] ${message}`);
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

function reportCatalogFailure(error: Error): void {
  console.error(error);
  const reporter = (globalThis as typeof globalThis & { reportError?: (value: unknown) => void }).reportError;
  if (typeof reporter === "function") reporter(error);
}

function hasBlockedPublicTerm(value: string): boolean {
  const lower = value.toLowerCase();
  return BLOCKED_PUBLIC_TERMS.some((term) => lower.includes(term));
}

function uniqueStrings(values: string[]): string[] {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

function categoryCopy(mainCategorySlug: string) {
  switch (mainCategorySlug) {
    case "bavarian-trachten-wear":
      return {
        specs: [
          "Trachten construction, embroidery and trim direction confirmed against the buyer brief",
          "Material, color, sizing and finishing reviewed before sampling or quotation",
          "Private labels and packaging developed to approved buyer requirements",
        ],
      };
    case "premium-leather-apparel":
      return {
        specs: [
          "Leather type, grade, thickness and finish selected to buyer requirements",
          "Construction, lining, hardware and fit confirmed during development",
          "Branding, labels and packaging reviewed before production commitment",
        ],
      };
    case "sportswear":
      return {
        specs: [
          "Sport-specific fabric and construction selected against intended use",
          "Team colors, sizing and decoration method confirmed from the buyer brief",
          "Labels, numbering and packaging reviewed before quotation or production",
        ],
      };
    case "streetwear-activewear":
      return {
        specs: [
          "Fabric, weight, fit and construction developed to the brand specification",
          "Print, embroidery, trims and private labels reviewed before sampling",
          "Colors, size range and packaging confirmed before production commitment",
        ],
      };
    case "leisure-nightwear":
      return {
        specs: [
          "Fabric, comfort, fit and construction selected for the intended buyer program",
          "Trims, closures, decoration and private labels confirmed during development",
          "Size range, colors and packaging reviewed before quotation or production",
        ],
      };
    default:
      return {
        specs: [
          "Material and construction confirmed against the approved buyer specification",
          "Sizing, colors and decoration reviewed during development",
          "Labels and packaging confirmed before production commitment",
        ],
      };
  }
}

function sanitizePublicProduct(product: ReleaseProduct, mainCategorySlug: string): DbProduct {
  const content = resolveBuyerReadyProductContent(product, mainCategorySlug);
  const gallery = uniqueStrings((Array.isArray(product.gallery) ? product.gallery : []).filter(Boolean));
  const safe = categoryCopy(mainCategorySlug);
  const verifiedDetails = (Array.isArray(product.details) ? product.details : []).filter(
    (detail) => !hasBlockedPublicTerm(`${detail.label} ${detail.value}`),
  );

  return {
    ...product,
    name: content.name,
    description: content.description,
    short_description: content.description,
    seo_title: content.seoTitle,
    seo_description: content.description,
    image_url: product.image_url ?? gallery[0] ?? null,
    gallery,
    details: verifiedDetails,
    specs: safe.specs,
    material_specifications: null,
    moq_display: null,
    moq_min: null,
    production_timeline: null,
    sample_timeline: null,
  };
}

export function asCatalogRelease(value: unknown): CatalogRelease {
  if (!value || typeof value !== "object") throw integrityError("invalid-release", "Published catalogue returned an invalid payload");
  const candidate = value as Partial<CatalogRelease>;
  if (!Array.isArray(candidate.products)) throw integrityError("invalid-release", "Published catalogue products are missing");
  return {
    products: candidate.products,
    releasedAt: typeof candidate.releasedAt === "string" ? candidate.releasedAt : null,
  };
}

export function asTaxonomyRelease(value: unknown): TaxonomyRelease {
  if (!value || typeof value !== "object") throw integrityError("invalid-taxonomy", "Published taxonomy returned an invalid payload");
  const candidate = value as Partial<TaxonomyRelease>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.assignments)) {
    throw integrityError("invalid-taxonomy", "Published taxonomy nodes or assignments are missing");
  }
  return { nodes: candidate.nodes, assignments: candidate.assignments };
}

function nodeAsCategory(node: TaxonomyNode, parentId: string | null): DbCategory {
  return {
    id: node.id,
    parent_id: parentId,
    slug: node.slug,
    name: node.name,
    short: node.description,
    description: node.description,
    image_url: node.image_url,
    catalog_url: null,
    details: [],
    seo_title: node.seo_title,
    seo_description: node.seo_description,
    sort_order: node.sort_order,
    is_published: true,
  };
}

function rootForLeaf(nodeById: Map<string, TaxonomyNode>, leaf: TaxonomyNode): TaxonomyNode | null {
  let current: TaxonomyNode | undefined = leaf;
  const visited = new Set<string>();
  while (current && current.parent_id) {
    if (visited.has(current.id)) return null;
    visited.add(current.id);
    current = nodeById.get(current.parent_id);
  }
  return current?.depth === 0 ? current : null;
}

export function validateCanonicalRelease(catalogue: CatalogRelease, taxonomy: TaxonomyRelease) {
  if (catalogue.products.length !== EXPECTED_PUBLISHED_PRODUCTS) {
    throw integrityError(
      "product-count",
      `Expected ${EXPECTED_PUBLISHED_PRODUCTS} published products, received ${catalogue.products.length}`,
    );
  }
  if (taxonomy.nodes.length !== EXPECTED_PUBLISHED_TAXONOMY_ROUTES) {
    throw integrityError(
      "taxonomy-count",
      `Expected ${EXPECTED_PUBLISHED_TAXONOMY_ROUTES} published taxonomy routes, received ${taxonomy.nodes.length}`,
    );
  }
  if (taxonomy.assignments.length !== EXPECTED_PUBLISHED_PRODUCTS) {
    throw integrityError(
      "assignment-count",
      `Expected ${EXPECTED_PUBLISHED_PRODUCTS} approved assignments, received ${taxonomy.assignments.length}`,
    );
  }

  const nodeById = new Map<string, TaxonomyNode>();
  for (const node of taxonomy.nodes) {
    if (nodeById.has(node.id)) throw integrityError("duplicate-node", `Duplicate taxonomy node ${node.id}`);
    nodeById.set(node.id, node);
  }

  const roots = taxonomy.nodes
    .filter((node) => node.depth === 0 && node.node_type === "main_category")
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  if (roots.length !== EXPECTED_PUBLIC_ROOTS) {
    throw integrityError(
      "root-count",
      `Expected ${EXPECTED_PUBLIC_ROOTS} main categories, received ${roots.length}`,
    );
  }
  const rootSlugs = new Set(roots.map((root) => root.slug));
  for (const expectedRoot of ROOT_ORDER) {
    if (!rootSlugs.has(expectedRoot)) {
      throw integrityError("root-identity", `Published main category ${expectedRoot} is missing`);
    }
  }
  for (const root of roots) {
    if (!ROOT_ORDER.includes(root.slug as (typeof ROOT_ORDER)[number])) {
      throw integrityError("root-identity", `Unexpected published main category ${root.slug}`);
    }
  }

  const productById = new Map<string, ReleaseProduct>();
  for (const product of catalogue.products) {
    if (productById.has(product.id)) throw integrityError("duplicate-product", `Duplicate published product ${product.id}`);
    productById.set(product.id, product);
  }

  const assignedProductIds = new Set<string>();
  const canonicalPaths = new Set<string>();
  const nodeAssignmentCounts = new Map<string, number>();

  for (const assignment of taxonomy.assignments) {
    const product = productById.get(assignment.product_id);
    if (!product) {
      throw integrityError(
        "missing-approved-product",
        `Approved product ${assignment.product_id} is missing from the published release`,
      );
    }
    if (assignedProductIds.has(assignment.product_id)) {
      throw integrityError("duplicate-assignment", `Product ${assignment.product_id} has more than one approved taxonomy assignment`);
    }
    assignedProductIds.add(assignment.product_id);

    const leaf = nodeById.get(assignment.taxonomy_node_id);
    if (!leaf || leaf.depth !== 2) {
      throw integrityError(
        "invalid-assignment-target",
        `Product ${assignment.product_id} points to a missing or non-leaf taxonomy node`,
      );
    }
    const audience = leaf.parent_id ? nodeById.get(leaf.parent_id) : undefined;
    const root = audience?.parent_id ? nodeById.get(audience.parent_id) : undefined;
    if (!audience || audience.depth !== 1 || !root || root.depth !== 0 || root.node_type !== "main_category") {
      throw integrityError("invalid-taxonomy-chain", `Taxonomy chain is incomplete for product ${assignment.product_id}`);
    }
    if (assignment.product_slug !== product.slug) {
      throw integrityError(
        "product-slug-mismatch",
        `Assignment slug ${assignment.product_slug} does not match product ${product.slug}`,
      );
    }
    if (assignment.full_slug_path !== leaf.full_slug_path) {
      throw integrityError(
        "taxonomy-path-mismatch",
        `Assignment taxonomy path ${assignment.full_slug_path} does not match ${leaf.full_slug_path}`,
      );
    }
    const expectedPath = `/products/${root.slug}/${audience.slug}/${leaf.slug}/${product.slug}`;
    if (assignment.canonical_path !== expectedPath) {
      throw integrityError(
        "canonical-mismatch",
        `Product ${assignment.product_id} canonical path is ${assignment.canonical_path}, expected ${expectedPath}`,
      );
    }
    if (canonicalPaths.has(assignment.canonical_path)) {
      throw integrityError("duplicate-canonical", `Duplicate canonical product URL ${assignment.canonical_path}`);
    }
    canonicalPaths.add(assignment.canonical_path);
    for (const nodeId of [root.id, audience.id, leaf.id]) {
      nodeAssignmentCounts.set(nodeId, (nodeAssignmentCounts.get(nodeId) ?? 0) + 1);
    }
  }

  for (const product of catalogue.products) {
    if (!assignedProductIds.has(product.id)) {
      throw integrityError("missing-taxonomy-assignment", `Published product ${product.id} has no approved taxonomy assignment`);
    }
  }
  for (const node of taxonomy.nodes) {
    if (!nodeAssignmentCounts.get(node.id)) {
      throw integrityError("empty-taxonomy-route", `Published taxonomy route ${node.full_slug_path} has no products`);
    }
  }

  return { nodeById, productById, roots };
}

export function buildBuyerReadyTree(catalogue: CatalogRelease, taxonomy: TaxonomyRelease): PublicTopCategory[] {
  const { nodeById, productById, roots } = validateCanonicalRelease(catalogue, taxonomy);

  return roots.map((root): PublicTopCategory => {
    const leafNodes = taxonomy.nodes
      .filter((node) => node.depth === 2 && rootForLeaf(nodeById, node)?.id === root.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

    const subs = leafNodes.map((leaf): PublicSubCategory => {
      const products = taxonomy.assignments
        .filter((assignment) => assignment.taxonomy_node_id === leaf.id)
        .map((assignment) => sanitizePublicProduct(productById.get(assignment.product_id)!, root.slug))
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      return { ...nodeAsCategory(leaf, root.id), products };
    });

    return {
      ...nodeAsCategory(root, null),
      subs,
      directProducts: [],
    };
  });
}

export function asCatalogRouteManifest(value: unknown): CatalogRouteManifest {
  if (!value || typeof value !== "object") throw integrityError("invalid-snapshot", "Verified catalogue snapshot is not an object");
  const candidate = value as Partial<CatalogRouteManifest>;
  if (candidate.schemaVersion !== 1 || candidate.productCount !== EXPECTED_PUBLISHED_PRODUCTS) {
    throw integrityError("invalid-snapshot", "Verified catalogue snapshot metadata is incomplete");
  }
  if (!Array.isArray(candidate.products) || candidate.products.length !== EXPECTED_PUBLISHED_PRODUCTS) {
    throw integrityError("invalid-snapshot", "Verified catalogue snapshot does not contain 254 products");
  }

  const productIds = new Set<string>();
  const canonicalPaths = new Set<string>();
  const roots = new Set<string>();
  const audiences = new Set<string>();
  const leaves = new Set<string>();

  for (const product of candidate.products) {
    const expectedPath = `/products/${product.main_category_slug}/${product.audience_slug}/${product.product_type_slug}/${product.product_slug}`;
    if (product.canonical_path !== expectedPath) {
      throw integrityError("invalid-snapshot-canonical", `Snapshot canonical mismatch for ${product.product_id}`);
    }
    if (productIds.has(product.product_id)) {
      throw integrityError("invalid-snapshot-duplicate", `Snapshot duplicates product ${product.product_id}`);
    }
    if (canonicalPaths.has(product.canonical_path)) {
      throw integrityError("invalid-snapshot-duplicate", `Snapshot duplicates canonical ${product.canonical_path}`);
    }
    if (!product.image_url || !Array.isArray(product.gallery) || product.gallery.length === 0) {
      throw integrityError("invalid-snapshot-media", `Snapshot product ${product.product_id} is missing media`);
    }
    if (product.gallery[0] !== product.image_url) {
      throw integrityError("invalid-snapshot-media", `Snapshot product ${product.product_id} front image is not gallery slot 1`);
    }
    productIds.add(product.product_id);
    canonicalPaths.add(product.canonical_path);
    roots.add(product.main_category_slug);
    audiences.add(`${product.main_category_slug}/${product.audience_slug}`);
    leaves.add(`${product.main_category_slug}/${product.audience_slug}/${product.product_type_slug}`);
  }

  if (roots.size !== EXPECTED_PUBLIC_ROOTS) {
    throw integrityError("invalid-snapshot-roots", `Snapshot contains ${roots.size} main categories`);
  }
  for (const expectedRoot of ROOT_ORDER) {
    if (!roots.has(expectedRoot)) {
      throw integrityError("invalid-snapshot-roots", `Snapshot is missing main category ${expectedRoot}`);
    }
  }
  for (const root of roots) {
    if (!ROOT_ORDER.includes(root as (typeof ROOT_ORDER)[number])) {
      throw integrityError("invalid-snapshot-roots", `Snapshot contains unexpected main category ${root}`);
    }
  }
  const routeCount = roots.size + audiences.size + leaves.size;
  if (routeCount !== EXPECTED_PUBLISHED_TAXONOMY_ROUTES) {
    throw integrityError("invalid-snapshot-taxonomy", `Snapshot contains ${routeCount} taxonomy routes`);
  }

  return candidate as CatalogRouteManifest;
}

function snapshotCategory(
  id: string,
  parentId: string | null,
  slug: string,
  name: string,
  sortOrder: number,
): DbCategory {
  return {
    id,
    parent_id: parentId,
    slug,
    name,
    short: null,
    description: null,
    image_url: null,
    catalog_url: null,
    details: [],
    seo_title: null,
    seo_description: null,
    sort_order: sortOrder,
    is_published: true,
  };
}

export function buildBuyerReadyTreeFromManifest(manifest: CatalogRouteManifest): PublicTopCategory[] {
  const verified = asCatalogRouteManifest(manifest);
  const roots = new Map<string, { name: string; products: ManifestProduct[] }>();
  for (const product of verified.products) {
    const current = roots.get(product.main_category_slug) ?? { name: product.main_category_name, products: [] };
    current.products.push(product);
    roots.set(product.main_category_slug, current);
  }

  return [...roots.entries()]
    .sort(([left], [right]) => ROOT_ORDER.indexOf(left as (typeof ROOT_ORDER)[number]) - ROOT_ORDER.indexOf(right as (typeof ROOT_ORDER)[number]))
    .map(([rootSlug, rootData], rootIndex): PublicTopCategory => {
      const rootId = `verified-snapshot-root:${rootSlug}`;
      const leafGroups = new Map<string, { row: ManifestProduct; products: ManifestProduct[] }>();
      for (const product of rootData.products) {
        const key = `${product.audience_slug}/${product.product_type_slug}`;
        const current = leafGroups.get(key) ?? { row: product, products: [] };
        current.products.push(product);
        leafGroups.set(key, current);
      }

      const subs = [...leafGroups.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, group], leafIndex): PublicSubCategory => {
          const leafId = `verified-snapshot-leaf:${rootSlug}/${key}`;
          const products = group.products
            .sort((a, b) => a.reference_code.localeCompare(b.reference_code, undefined, { numeric: true }))
            .map((product, productIndex): DbProduct => ({
              id: product.product_id,
              category_id: leafId,
              slug: product.product_slug,
              name: product.product_name,
              description: product.product_description ?? product.seo_description,
              image_url: product.image_url,
              gallery: uniqueStrings(product.gallery),
              specs: categoryCopy(rootSlug).specs,
              details: [],
              material_specifications: null,
              seo_title: product.seo_title,
              seo_description: product.seo_description,
              sort_order: productIndex,
              is_published: true,
              sku: product.reference_code,
              short_description: product.short_description,
              moq_display: null,
              moq_min: null,
              sample_timeline: null,
              production_timeline: null,
              updated_at: product.updated_at,
            }));
          return {
            ...snapshotCategory(leafId, rootId, group.row.product_type_slug, group.row.product_type_name, leafIndex),
            products,
          };
        });

      return {
        ...snapshotCategory(rootId, null, rootSlug, rootData.name, rootIndex),
        subs,
        directProducts: [],
      };
    });
}

export async function loadPublicCatalogTree({
  rpc,
  fetchImpl = fetch,
  snapshotUrl = "/catalog-route-manifest.json",
  report = reportCatalogFailure,
}: LoadPublicCatalogOptions): Promise<PublicTopCategory[]> {
  let liveFailure: Error;
  try {
    const [catalogueResult, taxonomyResult] = await Promise.all([
      rpc("catalog_get_public_release"),
      rpc("catalog_get_public_taxonomy"),
    ]);
    if (catalogueResult.error) {
      throw integrityError("release-rpc", catalogueResult.error.message || "Published catalogue could not be loaded");
    }
    if (taxonomyResult.error) {
      throw integrityError("taxonomy-rpc", taxonomyResult.error.message || "Published taxonomy could not be loaded");
    }
    return buildBuyerReadyTree(
      asCatalogRelease(catalogueResult.data),
      asTaxonomyRelease(taxonomyResult.data),
    );
  } catch (error) {
    liveFailure = error instanceof Error ? error : new Error(String(error));
    report(liveFailure);
  }

  try {
    const separator = snapshotUrl.includes("?") ? "&" : "?";
    const response = await fetchImpl(`${snapshotUrl}${separator}verified_fallback=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0" },
    });
    if (!response.ok) {
      throw integrityError("snapshot-http", `Verified catalogue snapshot returned HTTP ${response.status}`);
    }
    return buildBuyerReadyTreeFromManifest(asCatalogRouteManifest(await response.json()));
  } catch (error) {
    const snapshotFailure = error instanceof Error ? error : new Error(String(error));
    const combined = integrityError(
      "release-unavailable",
      `Live catalogue rejected (${errorMessage(liveFailure)}); verified snapshot unavailable (${errorMessage(snapshotFailure)})`,
    );
    report(combined);
    throw combined;
  }
}

async function fetchTree(): Promise<PublicTopCategory[]> {
  const db = supabase as unknown as { rpc: (name: string) => Promise<RpcResult> };
  return loadPublicCatalogTree({
    rpc: (name) =>
      name === "catalog_get_public_release"
        ? db.rpc("catalog_get_public_release")
        : db.rpc("catalog_get_public_taxonomy"),
  });
}

export function usePublicCatalogTree() {
  return useQuery({
    queryKey: K.tree,
    queryFn: fetchTree,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function usePublicTopCategory(slug?: string) {
  const query = usePublicCatalogTree();
  const top = slug ? query.data?.find((category: PublicTopCategory) => category.slug === slug) ?? null : null;
  return { ...query, data: top };
}

export function usePublicProduct(categorySlug?: string, productSlug?: string) {
  return useQuery({
    queryKey: K.product(categorySlug ?? "", productSlug ?? ""),
    enabled: Boolean(categorySlug && productSlug),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const tree = await fetchTree();
      const top = tree.find((category) => category.slug === categorySlug) ?? null;
      if (!top) return null;
      for (const sub of top.subs) {
        const product = sub.products.find((candidate) => candidate.slug === productSlug);
        if (product) return { product, subCategory: sub, topCategory: top };
      }
      return null;
    },
  });
}

export function adaptDbProduct(product: DbProduct): LegacyProduct & { slug: string; id: string } {
  const gallery = product.gallery.length ? product.gallery : product.image_url ? [product.image_url] : [];
  const details: ProductDetailSpec[] = Array.isArray(product.details) ? product.details : [];
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image_url ?? gallery[0] ?? "",
    gallery,
    description: product.description ?? "",
    specs: product.specs ?? [],
    details,
  };
}
