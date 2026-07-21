// Buyer-facing catalogue data must come from the approved production release only.
// No local, supplemental, demo or legacy catalogue is allowed to render publicly.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbCategory, DbProduct, ProductDetailSpec } from "./useCatalog";
import type { Product as LegacyProduct } from "@/lib/categories";
import { keywordLedProductName } from "@/lib/catalogSearchNames";

export type PublicSubCategory = DbCategory & { products: DbProduct[] };
export type PublicTopCategory = DbCategory & {
  subs: PublicSubCategory[];
  directProducts: DbProduct[];
};

type ReleaseProduct = DbProduct & {
  category_slug?: string | null;
  parent_slug?: string | null;
  updated_at?: string;
};

type CatalogRelease = {
  products: ReleaseProduct[];
  releasedAt: string | null;
};

type TaxonomyNode = {
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

type TaxonomyAssignment = {
  product_id: string;
  product_slug: string;
  taxonomy_node_id: string;
  full_slug_path: string;
  canonical_path: string;
  approved_at: string;
};

type TaxonomyRelease = {
  nodes: TaxonomyNode[];
  assignments: TaxonomyAssignment[];
};

const EXPECTED_ROOTS = 5;
const EXPECTED_PUBLISHED_PRODUCTS = 254;

const K = {
  tree: ["public-catalog", "buyer-ready-taxonomy-v2"] as const,
  product: (category: string, product: string) =>
    ["public-catalog", "buyer-ready-product-v2", category, product] as const,
};

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

function hasBlockedPublicTerm(value: string): boolean {
  const lower = value.toLowerCase();
  return BLOCKED_PUBLIC_TERMS.some((term) => lower.includes(term));
}

function uniqueStrings(values: string[]): string[] {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

function sanitizePublicProduct(product: ReleaseProduct): DbProduct {
  const name = keywordLedProductName(product.slug, product.name);
  const gallery = uniqueStrings((Array.isArray(product.gallery) ? product.gallery : []).filter(Boolean));
  const details = (Array.isArray(product.details) ? product.details : []).filter(
    (detail) => !hasBlockedPublicTerm(`${detail.label} ${detail.value}`),
  );
  const specs = (Array.isArray(product.specs) ? product.specs : []).filter(
    (spec) => !hasBlockedPublicTerm(spec),
  );

  return {
    ...product,
    name,
    image_url: product.image_url ?? gallery[0] ?? null,
    gallery,
    details,
    specs,
    moq_display: null,
    moq_min: null,
    production_timeline: null,
    sample_timeline: null,
  };
}

function asCatalogRelease(value: unknown): CatalogRelease {
  if (!value || typeof value !== "object") throw new Error("Published catalogue returned an invalid payload");
  const candidate = value as Partial<CatalogRelease>;
  if (!Array.isArray(candidate.products)) throw new Error("Published catalogue products are missing");
  return {
    products: candidate.products,
    releasedAt: typeof candidate.releasedAt === "string" ? candidate.releasedAt : null,
  };
}

function asTaxonomyRelease(value: unknown): TaxonomyRelease {
  if (!value || typeof value !== "object") throw new Error("Published taxonomy returned an invalid payload");
  const candidate = value as Partial<TaxonomyRelease>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.assignments)) {
    throw new Error("Published taxonomy nodes or assignments are missing");
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

function buildBuyerReadyTree(catalogue: CatalogRelease, taxonomy: TaxonomyRelease): PublicTopCategory[] {
  const nodeById = new Map(taxonomy.nodes.map((node) => [node.id, node]));
  const productById = new Map(catalogue.products.map((product) => [product.id, sanitizePublicProduct(product)]));
  const roots = taxonomy.nodes
    .filter((node) => node.depth === 0 && node.node_type === "main_category")
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  if (roots.length !== EXPECTED_ROOTS) {
    throw new Error(`Refusing incomplete public catalogue: expected ${EXPECTED_ROOTS} main categories, received ${roots.length}`);
  }
  if (taxonomy.assignments.length !== EXPECTED_PUBLISHED_PRODUCTS) {
    throw new Error(
      `Refusing incomplete public catalogue: expected ${EXPECTED_PUBLISHED_PRODUCTS} approved assignments, received ${taxonomy.assignments.length}`,
    );
  }

  const assignedProducts = new Set<string>();
  const tree = roots.map((root): PublicTopCategory => {
    const leafNodes = taxonomy.nodes
      .filter((node) => node.depth === 2 && rootForLeaf(nodeById, node)?.id === root.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

    const subs = leafNodes
      .map((leaf): PublicSubCategory => {
        const products = taxonomy.assignments
          .filter((assignment) => assignment.taxonomy_node_id === leaf.id)
          .map((assignment) => {
            const product = productById.get(assignment.product_id);
            if (!product) {
              throw new Error(`Approved product ${assignment.product_id} is missing from the public release`);
            }
            assignedProducts.add(product.id);
            return product;
          })
          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

        return { ...nodeAsCategory(leaf, root.id), products };
      })
      .filter((sub) => sub.products.length > 0);

    return {
      ...nodeAsCategory(root, null),
      subs,
      directProducts: [],
    };
  });

  if (assignedProducts.size !== EXPECTED_PUBLISHED_PRODUCTS) {
    throw new Error(
      `Refusing incomplete public catalogue: expected ${EXPECTED_PUBLISHED_PRODUCTS} unique products, received ${assignedProducts.size}`,
    );
  }

  return tree;
}

async function fetchTree(): Promise<PublicTopCategory[]> {
  const db = supabase as unknown as {
    rpc: (name: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };

  const [catalogueResult, taxonomyResult] = await Promise.all([
    db.rpc("catalog_get_public_release"),
    db.rpc("catalog_get_public_taxonomy"),
  ]);

  if (catalogueResult.error) {
    throw new Error(catalogueResult.error.message || "Published catalogue could not be loaded");
  }
  if (taxonomyResult.error) {
    throw new Error(taxonomyResult.error.message || "Published taxonomy could not be loaded");
  }

  return buildBuyerReadyTree(
    asCatalogRelease(catalogueResult.data),
    asTaxonomyRelease(taxonomyResult.data),
  );
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
  const top = slug ? query.data?.find((category) => category.slug === slug) ?? null : null;
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
  const clean = sanitizePublicProduct(product);
  const gallery = clean.gallery.length ? clean.gallery : clean.image_url ? [clean.image_url] : [];
  const details: ProductDetailSpec[] = Array.isArray(clean.details) ? clean.details : [];
  return {
    id: clean.id,
    slug: clean.slug,
    name: clean.name,
    image: clean.image_url ?? gallery[0] ?? "",
    gallery,
    description: clean.description ?? "",
    specs: clean.specs ?? [],
    details,
  };
}
