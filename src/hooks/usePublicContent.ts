import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_FAQS, type PublicFaq } from "@/lib/defaultFaqs";

export type PublicBlogPostSummary = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  author: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  published_at: string | null;
  sort_order: number;
};

export type PublicBlogPost = PublicBlogPostSummary & {
  body_md: string | null;
};

export type PublicSeoOverride = {
  route: string;
  locale: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  json_ld: object | object[] | null;
  noindex: boolean;
};

export type PublicInternalLink = {
  id: string;
  to_route: string;
  anchor_text: string;
  priority: number;
};

export type PublicPageTools = {
  seo: PublicSeoOverride | null;
  links: PublicInternalLink[];
};

const db = supabase as any;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength = 5000): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanRoute(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned.startsWith("/") || cleaned.startsWith("//") || /[?#]/.test(cleaned)) return null;
  return cleaned.slice(0, 500);
}

function cleanMediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return cleaned.slice(0, 1000);
  if (/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(cleaned)) return cleaned.slice(0, 1000);
  return null;
}

function cleanCanonical(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return cleaned.slice(0, 1000);
  if (/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(cleaned)) return cleaned.slice(0, 1000);
  return null;
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeBlogSummary(value: unknown): PublicBlogPostSummary | null {
  if (!isRecord(value)) return null;
  const id = cleanText(value.id, 120);
  const slug = cleanText(value.slug, 160);
  const title = cleanText(value.title, 180);
  if (!id || !slug || !title || !/^[a-z0-9][a-z0-9-]{1,159}$/.test(slug)) return null;
  return {
    id,
    slug,
    locale: cleanText(value.locale, 20) || "en",
    title,
    excerpt: cleanText(value.excerpt, 500),
    cover_image_url: cleanMediaUrl(value.cover_image_url),
    tags: cleanTags(value.tags),
    author: cleanText(value.author, 120),
    seo_title: cleanText(value.seo_title, 180),
    seo_description: cleanText(value.seo_description, 500),
    canonical_url: cleanCanonical(value.canonical_url),
    og_image_url: cleanMediaUrl(value.og_image_url),
    published_at: cleanText(value.published_at, 80),
    sort_order: typeof value.sort_order === "number" && Number.isFinite(value.sort_order) ? value.sort_order : 0,
  };
}

function normalizeBlogPost(value: unknown): PublicBlogPost | null {
  const summary = normalizeBlogSummary(value);
  if (!summary || !isRecord(value)) return null;
  return { ...summary, body_md: cleanText(value.body_md, 100_000) };
}

function normalizeFaq(value: unknown): PublicFaq | null {
  if (!isRecord(value)) return null;
  const id = cleanText(value.id, 120);
  const question = cleanText(value.question, 300);
  const answer = cleanText(value.answer, 4000);
  if (!id || !question || !answer) return null;
  return {
    id,
    locale: cleanText(value.locale, 20) || "en",
    category: cleanText(value.category, 120) || "General",
    question,
    answer,
    sort_order: typeof value.sort_order === "number" && Number.isFinite(value.sort_order) ? value.sort_order : 0,
  };
}

function normalizePageTools(value: unknown): PublicPageTools {
  if (!isRecord(value)) return { seo: null, links: [] };
  const seoValue = isRecord(value.seo) ? value.seo : null;
  let seo: PublicSeoOverride | null = null;
  if (seoValue) {
    const route = cleanRoute(seoValue.route);
    if (route) {
      const jsonLd = isRecord(seoValue.json_ld) || Array.isArray(seoValue.json_ld)
        ? seoValue.json_ld as object | object[]
        : null;
      seo = {
        route,
        locale: cleanText(seoValue.locale, 20) || "en",
        seo_title: cleanText(seoValue.seo_title, 180),
        seo_description: cleanText(seoValue.seo_description, 500),
        og_image_url: cleanMediaUrl(seoValue.og_image_url),
        canonical_url: cleanCanonical(seoValue.canonical_url),
        json_ld: jsonLd,
        noindex: seoValue.noindex === true,
      };
    }
  }

  const links = Array.isArray(value.links)
    ? value.links.map((item): PublicInternalLink | null => {
        if (!isRecord(item)) return null;
        const id = cleanText(item.id, 120);
        const toRoute = cleanRoute(item.to_route);
        const anchor = cleanText(item.anchor_text, 120);
        if (!id || !toRoute || !anchor) return null;
        return {
          id,
          to_route: toRoute,
          anchor_text: anchor,
          priority: typeof item.priority === "number" && Number.isFinite(item.priority) ? item.priority : 0,
        };
      }).filter((item): item is PublicInternalLink => Boolean(item))
    : [];

  return { seo, links };
}

export function usePublicBlogPosts(locale = "en") {
  return useQuery({
    queryKey: ["content-cms", "blog-posts", locale],
    queryFn: async (): Promise<PublicBlogPostSummary[]> => {
      const { data, error } = await db.rpc("content_get_public_blog_posts", { _locale: locale });
      if (error || !Array.isArray(data)) return [];
      return data
        .map(normalizeBlogSummary)
        .filter((item): item is PublicBlogPostSummary => Boolean(item));
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function usePublicBlogPost(slug?: string, locale = "en") {
  return useQuery({
    queryKey: ["content-cms", "blog-post", locale, slug || ""],
    enabled: Boolean(slug),
    queryFn: async (): Promise<PublicBlogPost | null> => {
      const { data, error } = await db.rpc("content_get_public_blog_post", {
        _slug: slug,
        _locale: locale,
      });
      if (error) return null;
      return normalizeBlogPost(data);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function usePublicFaqs(locale = "en") {
  return useQuery({
    queryKey: ["content-cms", "faqs", locale],
    queryFn: async (): Promise<PublicFaq[]> => {
      const { data, error } = await db.rpc("content_get_public_faqs", { _locale: locale });
      if (error || !Array.isArray(data)) return locale === "en" ? DEFAULT_FAQS : [];
      const normalized = data.map(normalizeFaq).filter((item): item is PublicFaq => Boolean(item));
      return normalized.length > 0 || locale !== "en" ? normalized : DEFAULT_FAQS;
    },
    initialData: locale === "en" ? DEFAULT_FAQS : [],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function usePublicPageTools(route: string, locale = "en") {
  return useQuery({
    queryKey: ["content-cms", "page-tools", locale, route],
    enabled: Boolean(route),
    queryFn: async (): Promise<PublicPageTools> => {
      const { data, error } = await db.rpc("content_get_public_page_tools", {
        _route: route,
        _locale: locale,
      });
      if (error) return { seo: null, links: [] };
      return normalizePageTools(data);
    },
    initialData: { seo: null, links: [] },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
