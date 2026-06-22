// Resolves DB-stored asset paths (e.g. "cat-bavarian.jpg", "products/bavarian-1.jpg")
// to actual bundled Vite URLs. Also supports full http(s) URLs for uploaded media.
const assets = import.meta.glob("/src/assets/**/*.{jpg,jpeg,png,webp,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const PLACEHOLDER = "/placeholder.svg";

export function resolveAsset(path?: string | null): string {
  if (!path) return PLACEHOLDER;
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  const key = `/src/assets/${path}`;
  return assets[key] ?? PLACEHOLDER;
}

export function resolveGallery(items?: string[] | null): string[] {
  if (!items?.length) return [];
  return items.map(resolveAsset);
}
