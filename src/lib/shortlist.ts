/**
 * Guest shortlist + recently-viewed + compare utilities.
 * All local-storage backed, no login. Feeds Phase 7 RFQ context.
 */
import { useEffect, useState, useCallback } from "react";
import { thumbnailUrl } from "@/lib/imageThumbnails";

const SHORTLIST_KEY = "irha_shortlist_v1";
const RECENT_KEY = "irha_recent_v1";
const COMPARE_KEY = "irha_compare_v1";
const MAX_SHORTLIST = 30;
const MAX_RECENT = 12;
const MAX_COMPARE = 4;

export type ShortlistItem = {
  slug: string;
  name: string;
  image?: string;
  categorySlug?: string;
  categoryName?: string;
  addedAt: number;
};

function normalizeStoredImage<T>(item: T): T {
  if (!item || typeof item !== "object" || !("image" in item)) return item;
  const value = item as T & { image?: unknown };
  if (typeof value.image !== "string" || !value.image) return item;
  return { ...value, image: thumbnailUrl(value.image) };
}

const read = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]).map(normalizeStoredImage) : [];
  } catch {
    return [];
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("irha:storage", { detail: { key } }));
  } catch {
    /* ignore quota */
  }
};

function useLocalList<T extends { slug: string }>(key: string, max: number) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    setItems(read<T>(key));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key?: string } | undefined;
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
      const normalized = normalizeStoredImage(item);
      const current = read<T>(key).filter((i) => i.slug !== normalized.slug);
      current.unshift(normalized);
      const trimmed = current.slice(0, max);
      write(key, trimmed);
    },
    [key, max],
  );

  const remove = useCallback(
    (slug: string) => {
      const current = read<T>(key).filter((i) => i.slug !== slug);
      write(key, current);
    },
    [key],
  );

  const clear = useCallback(() => write(key, []), [key]);
  const has = useCallback((slug: string) => items.some((i) => i.slug === slug), [items]);
  const toggle = useCallback(
    (item: T) => {
      const normalized = normalizeStoredImage(item);
      const current = read<T>(key);
      if (current.some((i) => i.slug === normalized.slug)) {
        write(key, current.filter((i) => i.slug !== normalized.slug));
      } else {
        current.unshift(normalized);
        write(key, current.slice(0, max));
      }
    },
    [key, max],
  );

  return { items, add, remove, clear, has, toggle };
}

export const useShortlist = () => useLocalList<ShortlistItem>(SHORTLIST_KEY, MAX_SHORTLIST);
export const useRecentlyViewed = () => useLocalList<ShortlistItem>(RECENT_KEY, MAX_RECENT);
export const useCompare = () => useLocalList<ShortlistItem>(COMPARE_KEY, MAX_COMPARE);

/** Add to recently viewed without hook — safe to call from any effect. */
export function pushRecentlyViewed(item: Omit<ShortlistItem, "addedAt">) {
  const now = Date.now();
  const normalized = normalizeStoredImage(item);
  const current = read<ShortlistItem>(RECENT_KEY).filter((i) => i.slug !== normalized.slug);
  current.unshift({ ...normalized, addedAt: now });
  write(RECENT_KEY, current.slice(0, MAX_RECENT));
}
