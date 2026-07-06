// Public catalog data layer — Supabase is the runtime source of truth.
// Commercial fields are intentionally hidden from public output until they are
// reviewed per product. Admin data remains unchanged.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbCategory, DbProduct, ProductDetailSpec } from "./useCatalog";
import type { Product as LegacyProduct } from "@/lib/categories";

export type PublicSubCategory = DbCategory & {
  products: DbProduct[];
};

export type PublicTopCategory = DbCategory & {
  subs: PublicSubCategory[];
  directProducts: DbProduct[];
};

const K = {
  tree: ["public-catalog", "tree"] as const,
  topWithSubs: (slug: string) => ["public-catalog", "top", slug] as const,
  product: (cat: string, prod: string) => ["public-catalog", "product", cat, prod] as const,
};

function sanitizePublicProduct(p: DbProduct): DbProduct {
  const details = (Array.isArray(p.details) ? p.details : []).filter(
    (d) => !/(moq|lead\s*time|production\s*timeline|sample\s*timeline|shipping\s*time)/i.test(d.label),
  );
  return {
    ...p,
    details,
    moq_display: null,
    moq_min: null,
    production_timeline: null,
    sample_timeline: null,
  };
}

async function fetchTree(): Promise<PublicTopCategory[]> {
  const [{ data: cats, error: cErr }, { data: prods, error: pErr }] = await Promise.all([
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
  const allProds = ((prods ?? []) as unknown as DbProduct[]).map(sanitizePublicProduct);

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
      const dbProd = sanitizePublicProduct(prod as unknown as DbProduct);

      const { data: cat, error: cErr } = await supabase
        .from("categories")
        .select("*")
        .eq("id", dbProd.category_id)
        .eq("is_published", true)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!cat) return null;
      const category = cat as DbCategory;

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

      const { LEGACY_TOP_SLUG_MAP } = await import("@/lib/legacyCategorySlugs");
      const canonicalRequested = LEGACY_TOP_SLUG_MAP[categorySlug ?? ""] ?? categorySlug;
      if (top.slug !== canonicalRequested && category.slug !== categorySlug && top.slug !== categorySlug) {
        return null;
      }
      return { product: dbProd, subCategory: category, topCategory: top };
    },
  });
}

export function adaptDbProduct(
  p: DbProduct,
): LegacyProduct & { slug: string; id: string } {
  const clean = sanitizePublicProduct(p);
  const gallery = clean.gallery?.length ? clean.gallery : clean.image_url ? [clean.image_url] : [];
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
