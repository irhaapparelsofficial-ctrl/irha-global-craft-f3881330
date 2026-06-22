import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductDetailSpec = { label: string; value: string };

export type DbCategory = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  short: string | null;
  description: string | null;
  image_url: string | null;
  catalog_url: string | null;
  details: string[];
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
};

export type DbProduct = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  gallery: string[];
  specs: string[];
  details: ProductDetailSpec[];
  material_specifications: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
};

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<DbCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DbCategory[];
    },
  });
}

export function useCategoryBySlug(slug?: string) {
  return useQuery({
    queryKey: ["category", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: cat, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!cat) return null;
      const { data: prods, error: pErr } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", cat.id)
        .order("sort_order", { ascending: true });
      if (pErr) throw pErr;
      return { category: cat as DbCategory, products: (prods ?? []) as DbProduct[] };
    },
  });
}

export function useProductBySlug(categorySlug?: string, productSlug?: string) {
  return useQuery({
    queryKey: ["product", categorySlug, productSlug],
    enabled: !!categorySlug && !!productSlug,
    queryFn: async () => {
      const { data: cat, error: cErr } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", categorySlug!)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!cat) return null;
      const { data: prod, error: pErr } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", cat.id)
        .eq("slug", productSlug!)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!prod) return null;
      return { category: cat as DbCategory, product: prod as DbProduct };
    },
  });
}
