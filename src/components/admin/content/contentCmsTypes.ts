export type BlogRow = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  body_md: string | null;
  tags: string[];
  author: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  published_at: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FaqRow = {
  id: string;
  locale: string;
  category: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type SeoOverrideRow = {
  id: string;
  route: string;
  locale: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  json_ld: Record<string, unknown> | unknown[] | null;
  noindex: boolean;
  is_published: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InternalLinkRow = {
  id: string;
  from_route: string;
  to_route: string;
  anchor_text: string;
  locale: string;
  priority: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type ContentHealth = {
  blogCount: number;
  publishedBlogCount: number;
  faqCount: number;
  publishedFaqCount: number;
  seoOverrideCount: number;
  publishedSeoOverrideCount: number;
  internalLinkCount: number;
  publishedInternalLinkCount: number;
  lastChangeAt: string | null;
};

export type ContentAuditRow = {
  id: string;
  entity_type: "blog_post" | "faq" | "seo_override" | "internal_link";
  entity_id: string;
  action: "insert" | "update" | "delete";
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}

export function normalizeRoute(value: string) {
  const route = value.trim().replace(/\s+/g, "");
  if (!route.startsWith("/") || route.startsWith("//") || /[?#]/.test(route)) return null;
  return route.slice(0, 500);
}

export function splitList(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
}

export function safeOptionalUrl(value: string) {
  const url = value.trim();
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url.slice(0, 1000);
  if (/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(url)) return url.slice(0, 1000);
  return undefined;
}

export function isMissingSchemaError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message || "")
    : String(error || "");
  return /does not exist|schema cache|could not find|PGRST205|PGRST202/i.test(message);
}

export function entityLabel(row: ContentAuditRow) {
  const data = row.after_data || row.before_data || {};
  for (const key of ["title", "question", "route", "anchor_text", "slug"]) {
    if (typeof data[key] === "string" && data[key]) return String(data[key]);
  }
  return row.entity_id.slice(0, 8);
}
