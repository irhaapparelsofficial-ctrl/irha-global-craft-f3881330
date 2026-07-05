// Public catalog data layer — Supabase is the runtime source of truth.
// Legacy hardcoded files in src/lib/{categories,catalog}.ts remain untouched
// as an emergency fallback (only used on genuine network/fetch errors).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbCategory, DbProduct, ProductDetailSpec } from "./useCatalog";
import type { Product as LegacyProduct } from "@/lib/categories";

// ---------- Types ----------

export type PublicSubCategory = DbCategory & {
  products: DbProduct[];
};

export type PublicTopCategory = DbCategory & {
  subs: PublicSubCategory[];
  directProducts: DbProduct[]; // products attached directly to top-level cat
};

// ---------- Query keys ----------
const K = {
  tree: ["public-catalog", "tree"] as const,
  topWithSubs: (slug: string) => ["public-catalog", "top", slug] as const,
  product: (cat: string, prod: string) =>
    ["public-catalog", "product", cat, prod] as const,
};

// ---------- Fetchers ----------

async function fetchTree(): Promise<PublicTopCategory[]> {
  const [{ data: cats, error: cErr }, { data: prods, error: pErr }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
    ]);
  if (cErr) throw cErr;
  if (pErr) throw pErr;

  const allCats = (cats ?? []) as DbCategory[];
  const allProds = (prods ?? []) as unknown as DbProduct[];

  const byParent = new Map<string, DbCategory[]>();
  const tops: DbCategory[] = [];
  for (const c of allCats) {
    if (!c.parent_id) tops.push(c);
    else {
      const arr = byParent.get(c.parent_id) ?? [];
      arr.push(c);
      byParent.set(c.parent_id, arr);
    }
  }

  const prodsByCat = new Map<string, DbProduct[]>();
  for (const p of allProds) {
    const arr = prodsByCat.get(p.category_id) ?? [];
    arr.push(p);
    prodsByCat.set(p.category_id, arr);
  }

  return tops.map((top) => {
    const subs = (byParent.get(top.id) ?? []).map((s) => ({
      ...s,
      products: prodsByCat.get(s.id) ?? [],
    }));
    return {
      ...top,
      subs,
      directProducts: prodsByCat.get(top.id) ?? [],
    };
  });
}

// ---------- Public hooks ----------

export function usePublicCatalogTree() {
  return useQuery({
    queryKey: K.tree,
    queryFn: fetchTree,
    staleTime: 60_000,
  });
}

export function usePublicTopCategory(slug?: string) {
  const q = usePublicCatalogTree();
  const top = slug ? q.data?.find((t) => t.slug === slug) ?? null : null;
  return { ...q, data: top };
}

/**
 * Resolve a product by URL (categorySlug/productSlug).
 * The URL uses the TOP-LEVEL category slug but products live under
 * sub-categories. We match the product by slug then verify its category
 * (or its category's parent) has the requested slug.
 */
export function usePublicProduct(categorySlug?: string, productSlug?: string) {
  return useQuery({
    queryKey: K.product(categorySlug ?? "", productSlug ?? ""),
    enabled: !!categorySlug && !!productSlug,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: prod, error: pErr } = await supabase
        .from("products")
        .select("*")
        .eq("slug", productSlug!)
        .eq("is_published", true)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!prod) return null;
      const dbProd = prod as unknown as DbProduct;

      const { data: cat, error: cErr } = await supabase
        .from("categories")
        .select("*")
        .eq("id", dbProd.category_id)
        .eq("is_published", true)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!cat) return null;
      const category = cat as DbCategory;

      // Resolve top-level ancestor.
      let top: DbCategory = category;
      if (category.parent_id) {
        const { data: parent, error: paErr } = await supabase
          .from("categories")
          .select("*")
          .eq("id", category.parent_id)
          .eq("is_published", true)
          .maybeSingle();
        if (paErr) throw paErr;
        if (!parent) return null;
        top = parent as DbCategory;
      }

      // Accept both current and legacy top-slug so old inbound URLs resolve.
      const { LEGACY_TOP_SLUG_MAP } = await import("@/lib/legacyCategorySlugs");
      const canonicalRequested = LEGACY_TOP_SLUG_MAP[categorySlug ?? ""] ?? categorySlug;
      if (
        top.slug !== canonicalRequested &&
        category.slug !== categorySlug &&
        top.slug !== categorySlug
      ) {
        return null;
      }
      return { product: dbProd, subCategory: category, topCategory: top };
    },
  });
}


// ---------- Adapter: DbProduct → legacy Product shape (for modal reuse) ----------

export function adaptDbProduct(
  p: DbProduct,
): LegacyProduct & { slug: string; id: string } {
  const gallery = p.gallery?.length ? p.gallery : p.image_url ? [p.image_url] : [];
  const details: ProductDetailSpec[] = Array.isArray(p.details) ? p.details : [];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.image_url ?? gallery[0] ?? "",
    gallery,
    description: p.description ?? "",
    specs: p.specs ?? [],
    details,
  };
}
