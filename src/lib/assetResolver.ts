// Resolves catalog and legacy asset paths to production-safe Vite URLs.
// Full remote URLs and public-root assets remain unchanged.
const assets = import.meta.glob("/src/assets/**/*.{avif,jpg,jpeg,png,webp,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

// Vite Image Tools creates lightweight card/list thumbnails for every imported
// raster asset. Width-only resizing preserves the source aspect ratio. Heroes
// can keep using the original imported URL.
const importedThumbnails = import.meta.glob("/src/assets/**/*.{avif,jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
  query: {
    w: "720",
    format: "webp",
    quality: "78",
  },
}) as Record<string, string>;

// One import produces all browser-selectable widths, including high-DPI and
// zoom candidates. The browser still downloads only the best rendered size.
const importedResponsiveSrcSets = import.meta.glob("/src/assets/**/*.{avif,jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
  query: {
    w: "360;720;1200;1600",
    format: "webp",
    quality: "82",
    as: "srcset",
  },
}) as Record<string, string>;

const resolvedThumbnailByAssetUrl = new Map<string, string>();
const resolvedResponsiveSrcSetByAssetUrl = new Map<string, string>();
for (const [assetPath, resolvedUrl] of Object.entries(assets)) {
  const thumbnailUrl = importedThumbnails[assetPath];
  if (thumbnailUrl) resolvedThumbnailByAssetUrl.set(resolvedUrl, thumbnailUrl);
  const responsiveSrcSet = importedResponsiveSrcSets[assetPath];
  if (responsiveSrcSet) resolvedResponsiveSrcSetByAssetUrl.set(resolvedUrl, responsiveSrcSet);
}

const PLACEHOLDER = "/placeholder.svg";

export function resolveAsset(assetPath?: string | null): string {
  if (!assetPath) return PLACEHOLDER;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  if (assetPath.startsWith("/src/assets/")) return assets[assetPath] ?? PLACEHOLDER;
  if (assetPath.startsWith("/")) return assetPath;
  const key = `/src/assets/${assetPath}`;
  return assets[key] ?? PLACEHOLDER;
}

export function resolveImportedThumbnail(assetUrl?: string | null): string | null {
  if (!assetUrl) return null;
  return resolvedThumbnailByAssetUrl.get(assetUrl) ?? null;
}

export function resolveImportedResponsiveSrcSet(assetUrl?: string | null): string | null {
  if (!assetUrl) return null;
  return resolvedResponsiveSrcSetByAssetUrl.get(assetUrl) ?? null;
}

export function resolveGallery(items?: string[] | null): string[] {
  if (!items?.length) return [];
  return items.map(resolveAsset);
}
