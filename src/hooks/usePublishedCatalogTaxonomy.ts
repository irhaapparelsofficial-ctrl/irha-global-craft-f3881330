import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NormalizedCategory, NormalizedProduct } from "@/hooks/usePublicCategoryData";
import {
  buildCategoryTaxonomy,
  type AudienceSlug,
  type CategoryTaxonomy,
  type TaxonomyAudience,
  type TaxonomyCollection,
  type TaxonomyProduct,
} from "@/lib/globalCategoryTaxonomy";

export type PublishedTaxonomyNode = {
  id: string;
  parent_id: string | null;
  node_type: "main_category" | "audience" | "buyer_group" | "accessories" | "product_type" | "collection";
  slug: string;
  name: string;
  depth: number;
  full_slug_path: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  updated_at: string;
};

export type PublishedTaxonomyAssignment = {
  product_id: string;
  product_slug: string;
  taxonomy_node_id: string;
  full_slug_path: string;
  canonical_path: string;
  approved_at: string;
};

export type PublishedTaxonomyRelease = {
  nodes: PublishedTaxonomyNode[];
  assignments: PublishedTaxonomyAssignment[];
};

export type PublishedProductRoute = {
  assignment: PublishedTaxonomyAssignment;
  root: PublishedTaxonomyNode;
  audience: PublishedTaxonomyNode;
  collection: PublishedTaxonomyNode;
  canonicalPath: string;
};

type ProductSource = {
  product: NormalizedProduct;
  subSlug: string;
  subName: string;
};

export const PUBLISHED_TAXONOMY_QUERY_KEY = ["public-catalog", "explicit-taxonomy-v1"] as const;

function isRelease(value: unknown): value is PublishedTaxonomyRelease {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PublishedTaxonomyRelease>;
  return Array.isArray(candidate.nodes) && Array.isArray(candidate.assignments);
}

export async function fetchPublishedTaxonomy(): Promise<PublishedTaxonomyRelease> {
  const { data, error } = await (supabase as unknown as {
    rpc: (name: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
  }).rpc("catalog_get_public_taxonomy");

  if (error) throw new Error(error.message || "Published catalogue hierarchy could not be loaded");
  if (!isRelease(data)) throw new Error("Published catalogue hierarchy returned an invalid payload");
  return data;
}

function productSources(category: NormalizedCategory) {
  const byId = new Map<string, ProductSource>();
  const bySlug = new Map<string, ProductSource>();

  for (const sub of category.subs) {
    for (const product of sub.products) {
      const source = { product, subSlug: sub.slug, subName: sub.name };
      if (product.id) byId.set(product.id, source);
      bySlug.set(product.slug, source);
    }
  }

  return { byId, bySlug };
}

function asTaxonomyProduct(source: ProductSource): TaxonomyProduct {
  return {
    ...source.product,
    sourceSubSlug: source.subSlug,
    sourceSubName: source.subName,
  };
}

export function buildPublishedCategoryTaxonomy(
  category: NormalizedCategory,
  release: PublishedTaxonomyRelease,
): CategoryTaxonomy | null {
  const root = release.nodes.find(
    (node) => node.depth === 0 && node.node_type === "main_category" && node.full_slug_path === category.slug,
  );
  if (!root) return null;

  const { byId, bySlug } = productSources(category);
  const assignmentsByNode = new Map<string, PublishedTaxonomyAssignment[]>();
  for (const assignment of release.assignments) {
    const current = assignmentsByNode.get(assignment.taxonomy_node_id) ?? [];
    current.push(assignment);
    assignmentsByNode.set(assignment.taxonomy_node_id, current);
  }

  const audienceNodes = release.nodes
    .filter((node) => node.parent_id === root.id && node.depth === 1)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const assignedSlugs = new Set<string>();

  const audiences: TaxonomyAudience[] = audienceNodes.map((audienceNode) => {
    const collectionNodes = release.nodes
      .filter((node) => node.parent_id === audienceNode.id && node.depth === 2)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

    const collections: TaxonomyCollection[] = collectionNodes.map((collectionNode) => {
      const products = (assignmentsByNode.get(collectionNode.id) ?? [])
        .map((assignment) => byId.get(assignment.product_id) ?? bySlug.get(assignment.product_slug))
        .filter((source): source is ProductSource => Boolean(source))
        .map((source) => {
          assignedSlugs.add(source.product.slug);
          return asTaxonomyProduct(source);
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        slug: collectionNode.slug,
        name: collectionNode.name,
        keyword: collectionNode.seo_title ?? `${collectionNode.name} manufacturer`,
        description:
          collectionNode.description
          ?? `${collectionNode.name} programs developed for wholesale, OEM, ODM and private-label buyers.`,
        products,
      };
    });

    return {
      slug: audienceNode.slug as AudienceSlug,
      name: audienceNode.name,
      keyword: audienceNode.seo_title ?? `${audienceNode.name} apparel manufacturer`,
      description:
        audienceNode.description
        ?? `${audienceNode.name} manufacturing programs developed against buyer-approved specifications.`,
      collections,
      productCount: new Set(collections.flatMap((collection) => collection.products.map((product) => product.slug))).size,
    };
  });

  return {
    categorySlug: category.slug,
    audiences,
    unassignedCount: category.subs
      .flatMap((sub) => sub.products)
      .filter((product) => !assignedSlugs.has(product.slug)).length,
  };
}

export function findPublishedProductRoute(
  release: PublishedTaxonomyRelease | undefined,
  productId?: string | null,
  productSlug?: string | null,
): PublishedProductRoute | null {
  if (!release) return null;
  const assignment = release.assignments.find(
    (candidate) => (productId && candidate.product_id === productId) || (productSlug && candidate.product_slug === productSlug),
  );
  if (!assignment) return null;

  const collection = release.nodes.find((node) => node.id === assignment.taxonomy_node_id && node.depth === 2);
  const audience = collection ? release.nodes.find((node) => node.id === collection.parent_id && node.depth === 1) : undefined;
  const root = audience ? release.nodes.find((node) => node.id === audience.parent_id && node.depth === 0) : undefined;
  if (!collection || !audience || !root) return null;

  return {
    assignment,
    root,
    audience,
    collection,
    canonicalPath: `/products/${assignment.full_slug_path}/${assignment.product_slug}`,
  };
}

export function usePublishedCatalogTaxonomyRelease() {
  return useQuery({
    queryKey: PUBLISHED_TAXONOMY_QUERY_KEY,
    queryFn: fetchPublishedTaxonomy,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function usePublishedCategoryTaxonomy(category: NormalizedCategory | null) {
  const query = usePublishedCatalogTaxonomyRelease();
  const fallbackTaxonomy = category ? buildCategoryTaxonomy(category) : null;
  const publishedTaxonomy = category && query.data
    ? buildPublishedCategoryTaxonomy(category, query.data)
    : null;
  const taxonomy = publishedTaxonomy ?? fallbackTaxonomy;

  return {
    ...query,
    isLoading: query.isLoading && !taxonomy,
    taxonomy,
    hasPublishedRelease: Boolean(query.data?.nodes.length && query.data?.assignments.length),
  };
}
