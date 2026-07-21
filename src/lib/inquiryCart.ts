import { useMemo, useSyncExternalStore } from "react";
import { thumbnailUrl } from "@/lib/imageThumbnails";

const CART_KEY = "irha_inquiry_cart_v1";
const LEGACY_SHORTLIST_KEY = "irha_shortlist_v1";
const MAX_ITEMS = 50;

export type InquiryCartItem = {
  productId?: string;
  slug: string;
  name: string;
  image?: string;
  categorySlug?: string;
  categoryName?: string;
  canonicalPath?: string;
  targetQuantity: string;
  sizeBreakdown: string;
  notes: string;
  addedAt: number;
};

type IncomingCartItem = Pick<InquiryCartItem, "slug" | "name"> &
  Partial<Omit<InquiryCartItem, "slug" | "name">>;

const EMPTY_SERVER_SNAPSHOT: InquiryCartItem[] = [];
let snapshot: InquiryCartItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function sanitizeText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sanitizeCanonicalPath(value: unknown) {
  const path = sanitizeText(value, 800);
  if (!path.startsWith("/products/") || path.includes("..") || /[\r\n\t ]/.test(path)) return undefined;
  return path.replace(/\/{2,}/g, "/").replace(/\/$/, "");
}

function sanitizeItem(value: unknown): InquiryCartItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const slug = sanitizeText(item.slug, 180);
  const name = sanitizeText(item.name, 240);
  if (!slug || !name) return null;

  return {
    productId: sanitizeText(item.productId, 80) || undefined,
    slug,
    name,
    image: sanitizeText(item.image, 2000) ? thumbnailUrl(sanitizeText(item.image, 2000)) : undefined,
    categorySlug: sanitizeText(item.categorySlug, 180) || undefined,
    categoryName: sanitizeText(item.categoryName, 180) || undefined,
    canonicalPath: sanitizeCanonicalPath(item.canonicalPath),
    targetQuantity: sanitizeText(item.targetQuantity, 12),
    sizeBreakdown: sanitizeText(item.sizeBreakdown, 1000),
    notes: sanitizeText(item.notes, 2000),
    addedAt: Number.isFinite(Number(item.addedAt)) ? Number(item.addedAt) : Date.now(),
  };
}

function sanitizeList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: InquiryCartItem[] = [];
  for (const valueItem of value) {
    const item = sanitizeItem(valueItem);
    if (!item || seen.has(item.slug)) continue;
    seen.add(item.slug);
    items.push(item);
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

function readStored(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? sanitizeList(JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  const current = readStored(CART_KEY);
  if (current.length > 0) {
    snapshot = current;
  } else {
    const migrated = readStored(LEGACY_SHORTLIST_KEY).map((item) => ({
      ...item,
      targetQuantity: "",
      sizeBreakdown: "",
      notes: "",
    }));
    snapshot = migrated;
    if (migrated.length > 0) {
      try {
        window.localStorage.setItem(CART_KEY, JSON.stringify(migrated));
      } catch {
        // The buyer can still use the current tab when persistent storage is unavailable.
      }
    }
  }
  hydrated = true;
}

function emit(next: InquiryCartItem[]) {
  snapshot = sanitizeList(next);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(snapshot));
    } catch {
      // Keep the in-memory cart usable when storage is unavailable or full.
    }
    window.dispatchEvent(new CustomEvent("irha:inquiry-cart"));
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window === "undefined") return () => listeners.delete(listener);

  const onExternalChange = (event: Event) => {
    if (event instanceof StorageEvent && event.key && event.key !== CART_KEY) return;
    const next = readStored(CART_KEY);
    if (JSON.stringify(next) !== JSON.stringify(snapshot)) {
      snapshot = next;
      listeners.forEach((callback) => callback());
    }
  };

  window.addEventListener("storage", onExternalChange);
  window.addEventListener("irha:inquiry-cart", onExternalChange);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onExternalChange);
    window.removeEventListener("irha:inquiry-cart", onExternalChange);
  };
}

function getSnapshot() {
  hydrate();
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY_SERVER_SNAPSHOT;
}

function normalizeIncoming(item: IncomingCartItem): InquiryCartItem | null {
  return sanitizeItem({
    ...item,
    targetQuantity: item.targetQuantity ?? "",
    sizeBreakdown: item.sizeBreakdown ?? "",
    notes: item.notes ?? "",
    addedAt: item.addedAt ?? Date.now(),
  });
}

export function inquiryCartProductPath(item: Pick<InquiryCartItem, "slug" | "categorySlug" | "canonicalPath">) {
  if (item.canonicalPath) return item.canonicalPath;
  const category = item.categorySlug?.trim();
  if (!category) return "/products";
  return `/products/${encodeURIComponent(category)}/${encodeURIComponent(item.slug)}`;
}

export function addInquiryItem(item: IncomingCartItem) {
  hydrate();
  const normalized = normalizeIncoming(item);
  if (!normalized) return;
  emit([normalized, ...snapshot.filter((current) => current.slug !== normalized.slug)].slice(0, MAX_ITEMS));
}

export function removeInquiryItem(slug: string) {
  hydrate();
  const normalized = slug.trim();
  if (!normalized) return;
  emit(snapshot.filter((item) => item.slug !== normalized));
}

export function updateInquiryItem(slug: string, patch: Partial<Pick<InquiryCartItem, "targetQuantity" | "sizeBreakdown" | "notes">>) {
  hydrate();
  const normalizedSlug = slug.trim();
  emit(snapshot.map((item) => {
    if (item.slug !== normalizedSlug) return item;
    return {
      ...item,
      targetQuantity: patch.targetQuantity === undefined
        ? item.targetQuantity
        : sanitizeText(patch.targetQuantity.replace(/[^\d]/g, ""), 8),
      sizeBreakdown: patch.sizeBreakdown === undefined ? item.sizeBreakdown : sanitizeText(patch.sizeBreakdown, 1000),
      notes: patch.notes === undefined ? item.notes : sanitizeText(patch.notes, 2000),
    };
  }));
}

export function clearInquiryCart() {
  emit([]);
}

export function toggleInquiryItem(item: IncomingCartItem) {
  hydrate();
  if (snapshot.some((current) => current.slug === item.slug)) {
    removeInquiryItem(item.slug);
  } else {
    addInquiryItem(item);
  }
}

export function useInquiryCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(() => ({
    items,
    count: items.length,
    has: (slug: string) => items.some((item) => item.slug === slug),
    add: addInquiryItem,
    remove: removeInquiryItem,
    update: updateInquiryItem,
    clear: clearInquiryCart,
    toggle: toggleInquiryItem,
  }), [items]);
}
