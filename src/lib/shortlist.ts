/**
 * Guest shortlist + recently-viewed + compare utilities.
 * Legacy shortlist actions are mirrored into the global inquiry cart so older
 * product cards remain compatible while the public UI migrates to RFQ wording.
 */
import { useEffect, useState, useCallback } from "react";
import { thumbnailUrl } from "@/lib/imageThumbnails";
import { addInquiryItem, clearInquiryCart, removeInquiryItem } from "@/lib/inquiryCart";

const SHORTLIST_KEY = "irha_shortlist_v1";
const RECENT_KEY = "irha_recent_v1";
const COMPARE_KEY = "irha_compare_v1";
const MAX_SHORTLIST = 30;
const MAX_RECENT = 12;
const MAX_COMPARE = 4;
const CANONICAL_PRODUCT_PATH = /^\/products\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/;

export type ShortlistItem = {
  slug: string;
  name: string;
  image?: string;
  categorySlug?: string;
  categoryName?: string;
  canonicalPath?: string;
  addedAt: number;
};

function normalizeStoredImage<T>(item: T): T {
  if (!item || typeof item !== "object" || !("image" in item)) return item;
  const value = item as T & { image?: unknown };
  if (typeof value.image !== "string" || !value.image) return item;
  return { ...value, image: thumbnailUrl(value.image) };
}

function withCurrentCanonicalPath<T>(item: T): T {
  if (!item || typeof item !== "object" || typeof window === "undefined") return item;
  const value = item as T & { canonicalPath?: unknown };
  if (typeof value.canonicalPath === "string" && CANONICAL_PRODUCT_PATH.test(value.canonicalPath)) return item;
  const pathname = window.location.pathname.replace(/\/$/, "");
  if (!CANONICAL_PRODUCT_PATH.test(pathname)) return item;
  return { ...value, canonicalPath: pathname } as T;
}

function hasStoredSlug<T extends { slug: string }>(value: unknown): value is T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const slug = (value as { slug?: unknown }).slug;
  return typeof slug === "string" && slug.trim().length > 0;
}

export function sanitizeStoredList<T extends { slug: string }>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is T => hasStoredSlug<T>(item))
    .map(normalizeStoredImage);
}

export function addUniqueStoredItem<T extends { slug: string }>(currentValue: unknown, item: T, max: number): T[] {
  if (!hasStoredSlug<T>(item) || max <= 0) return sanitizeStoredList<T>(currentValue).slice(0, Math.max(0, max));
  const normalized = normalizeStoredImage(withCurrentCanonicalPath(item));
  const current = sanitizeStoredList<T>(currentValue).filter((stored) => stored.slug !== normalized.slug);
  return [normalized, ...current].slice(0, max);
}

export function toggleStoredItem<T extends { slug: string }>(currentValue: unknown, item: T, max: number): T[] {
  if (!hasStoredSlug<T>(item)) return sanitizeStoredList<T>(currentValue).slice(0, Math.max(0, max));
  const normalized = normalizeStoredImage(withCurrentCanonicalPath(item));
  const current = sanitizeStoredList<T>(currentValue);
  if (current.some((stored) => stored.slug === normalized.slug)) {
    return current.filter((stored) => stored.slug !== normalized.slug);
  }
  return [normalized, ...current].slice(0, Math.max(0, max));
}

const read = <T extends { slug: string },>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return sanitizeStoredList<T>(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("irha:storage", { detail: { key } }));
  } catch {
    /* Storage can be unavailable or full; the public page must remain usable. */
  }
};

function mirrorShortlistAdd<T extends { slug: string }>(key: string, item: T) {
  if (key !== SHORTLIST_KEY) return;
  const product = withCurrentCanonicalPath(item) as T & Partial<ShortlistItem>;
  addInquiryItem({
    slug: product.slug,
    name: product.name || product.slug,
    image: product.image,
    categorySlug: product.categorySlug,
    categoryName: product.categoryName,
    canonicalPath: product.canonicalPath,
    addedAt: product.addedAt || Date.now(),
  });
}

function mirrorShortlistRemove(key: string, slug: string) {
  if (key === SHORTLIST_KEY) removeInquiryItem(slug);
}

export function shortlistProductPath(item: Pick<ShortlistItem, "slug" | "categorySlug" | "canonicalPath">) {
  const canonicalPath = item.canonicalPath?.trim();
  if (canonicalPath && CANONICAL_PRODUCT_PATH.test(canonicalPath)) return canonicalPath;
  const slug = item.slug.trim();
  const categorySlug = item.categorySlug?.trim();
  if (!slug || !categorySlug) return "/products";
  return `/products/${encodeURIComponent(categorySlug)}/${encodeURIComponent(slug)}`;
}

function useLocalList<T extends { slug: string }>(key: string, max: number) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    setItems(read<T>(key));
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent).detail as { key?: string } | undefined;
      if (!detail || detail.key === key) setItems(read<T>(key));
    };
    window.addEventListener("irha:storage", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("irha:storage", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [key]);

  const add = useCallback(
    (item: T) => {
      const normalized = withCurrentCanonicalPath(item);
      write(key, addUniqueStoredItem<T>(read<T>(key), normalized, max));
      mirrorShortlistAdd(key, normalized);
    },
    [key, max],
  );

  const remove = useCallback(
    (slug: string) => {
      const normalizedSlug = slug.trim();
      if (!normalizedSlug) return;
      write(key, read<T>(key).filter((item) => item.slug !== normalizedSlug));
      mirrorShortlistRemove(key, normalizedSlug);
    },
    [key],
  );

  const clear = useCallback(() => {
    write(key, []);
    if (key === SHORTLIST_KEY) clearInquiryCart();
  }, [key]);
  const has = useCallback((slug: string) => items.some((item) => item.slug === slug), [items]);
  const toggle = useCallback(
    (item: T) => {
      const normalized = withCurrentCanonicalPath(item);
      const current = read<T>(key);
      const wasStored = current.some((stored) => stored.slug === normalized.slug);
      write(key, toggleStoredItem<T>(current, normalized, max));
      if (wasStored) mirrorShortlistRemove(key, normalized.slug);
      else mirrorShortlistAdd(key, normalized);
    },
    [key, max],
  );

  return { items, add, remove, clear, has, toggle };
}

export const useShortlist = () => useLocalList<ShortlistItem>(SHORTLIST_KEY, MAX_SHORTLIST);
export const useRecentlyViewed = () => useLocalList<ShortlistItem>(RECENT_KEY, MAX_RECENT);
export const useCompare = () => useLocalList<ShortlistItem>(COMPARE_KEY, MAX_COMPARE);

/** Add to recently viewed without a hook — safe to call from any effect. */
export function pushRecentlyViewed(item: Omit<ShortlistItem, "addedAt">) {
  if (!hasStoredSlug<ShortlistItem>(item)) return;
  const normalized = withCurrentCanonicalPath(item);
  const next = addUniqueStoredItem<ShortlistItem>(
    read<ShortlistItem>(RECENT_KEY),
    { ...normalizeStoredImage(normalized), addedAt: Date.now() },
    MAX_RECENT,
  );
  write(RECENT_KEY, next);
}
