// Resolves catalog and legacy asset paths to production-safe Vite URLs.
// Full remote URLs and public-root assets remain unchanged.
const assets = import.meta.glob("/src/assets/**/*.{jpg,jpeg,png,webp,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const PLACEHOLDER = "/placeholder.svg";

export function resolveAsset(assetPath?: string | null): string {
  if (!assetPath) return PLACEHOLDER;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  if (assetPath.startsWith("/src/assets/")) {
    return assets[assetPath] ?? PLACEHOLDER;
  }

  if (assetPath.startsWith("/")) return assetPath;

  const key = `/src/assets/${assetPath}`;
  return assets[key] ?? PLACEHOLDER;
}

export function resolveGallery(items?: string[] | null): string[] {
  if (!items?.length) return [];
  return items.map(resolveAsset);
}
