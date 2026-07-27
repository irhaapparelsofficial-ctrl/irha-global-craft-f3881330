import {
  resolveImportedResponsiveSrcSet,
  resolveImportedThumbnail,
} from "@/lib/assetResolver";

const STATIC_ALREADY_THUMBNAIL = /^\/(?:thumbnails|catalogs\/thumbs)\//i;
// Legacy 2400 paths remain recognizable so old URLs can resolve to their
// canonical originals and controlled cleanup can identify them safely.
const STATIC_ALREADY_RESPONSIVE = /^\/responsive\/(?:360|720|1200|1600|2400)\//i;
const RESPONSIVE_PREFIX = /^responsive\/(?:360|720|1200|1600|2400)\/(.+)\.webp$/i;
const LEGACY_2400_PREFIX = /^responsive\/2400\/.+\.webp$/i;
const RASTER_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i;
const SUPABASE_PUBLIC_MARKER = "/storage/v1/object/public/";
const SITE_HOSTS = new Set(["irhaapparels.com", "www.irhaapparels.com"]);

export const RESPONSIVE_IMAGE_WIDTHS = [360, 720, 1200, 1600] as const;
export type ResponsiveImageWidth = typeof RESPONSIVE_IMAGE_WIDTHS[number];

function splitUrlSuffix(value: string) {
  const match = value.match(/^([^?#]*)(.*)$/);
  return { pathname: match?.[1] ?? value, suffix: match?.[2] ?? "" };
}

function originalObjectPath(objectPath: string): string {
  const clean = objectPath.replace(/^\/+/, "");
  const responsive = clean.match(RESPONSIVE_PREFIX);
  if (responsive) return responsive[1];
  if (clean.startsWith("thumbnails/") && clean.endsWith(".webp")) {
    return clean.slice("thumbnails/".length, -".webp".length);
  }
  return clean;
}

export function thumbnailObjectPath(objectPath: string): string {
  const clean = objectPath.replace(/^\/+/, "");
  if (clean.startsWith("thumbnails/")) return clean;
  return `thumbnails/${originalObjectPath(clean)}.webp`;
}

export function responsiveVariantObjectPath(
  objectPath: string,
  width: ResponsiveImageWidth,
): string {
  const original = originalObjectPath(objectPath);
  if (width === 720) return thumbnailObjectPath(original);
  return `responsive/${width}/${original}.webp`;
}

export function legacyResponsive2400ObjectPath(objectPath: string): string {
  return `responsive/2400/${originalObjectPath(objectPath)}.webp`;
}

export function isLegacyResponsive2400ObjectPath(objectPath: string): boolean {
  return LEGACY_2400_PREFIX.test(objectPath.replace(/^\/+/, ""));
}

export function responsiveVariantObjectPathsForCleanup(objectPath: string): string[] {
  return Array.from(new Set([
    ...RESPONSIVE_IMAGE_WIDTHS.map((width) => responsiveVariantObjectPath(objectPath, width)),
    legacyResponsive2400ObjectPath(objectPath),
  ]));
}

export function thumbnailUrl(source?: string | null): string {
  if (!source) return "";
  if (/^(?:data|blob):/i.test(source) || !RASTER_EXTENSION.test(source)) return source;
  if (STATIC_ALREADY_THUMBNAIL.test(source)) return source;

  const importedThumbnail = resolveImportedThumbnail(source);
  if (importedThumbnail) return importedThumbnail;

  if (source.startsWith("/")) {
    if (source.startsWith("/assets/") || STATIC_ALREADY_RESPONSIVE.test(source)) return source;
    const { pathname, suffix } = splitUrlSuffix(source);
    return `/thumbnails/${pathname.replace(/^\/+/, "")}.webp${suffix}`;
  }

  try {
    const url = new URL(source);
    const markerIndex = url.pathname.indexOf(SUPABASE_PUBLIC_MARKER);
    if (markerIndex >= 0) {
      const prefix = url.pathname.slice(0, markerIndex + SUPABASE_PUBLIC_MARKER.length);
      const publicObject = url.pathname.slice(markerIndex + SUPABASE_PUBLIC_MARKER.length);
      const slashIndex = publicObject.indexOf("/");
      if (slashIndex > 0) {
        const bucket = publicObject.slice(0, slashIndex);
        const objectPath = publicObject.slice(slashIndex + 1);
        if (bucket === "site-media" && !objectPath.startsWith("thumbnails/")) {
          url.pathname = `${prefix}${bucket}/${thumbnailObjectPath(objectPath)}`;
          return url.toString();
        }
      }
    }

    if (SITE_HOSTS.has(url.hostname) && RASTER_EXTENSION.test(url.pathname) && !STATIC_ALREADY_THUMBNAIL.test(url.pathname)) {
      if (url.pathname.startsWith("/assets/") || STATIC_ALREADY_RESPONSIVE.test(url.pathname)) return source;
      url.pathname = `/thumbnails/${url.pathname.replace(/^\/+/, "")}.webp`;
      return url.toString();
    }
  } catch {
    return source;
  }
  return source;
}

export function originalImageUrl(source?: string | null): string {
  if (!source) return "";
  if (source.startsWith("/thumbnails/") && source.includes(".webp")) {
    const { pathname, suffix } = splitUrlSuffix(source);
    return `/${pathname.slice("/thumbnails/".length).replace(/\.webp$/, "")}${suffix}`;
  }
  if (STATIC_ALREADY_RESPONSIVE.test(source) && source.includes(".webp")) {
    const { pathname, suffix } = splitUrlSuffix(source);
    return `/${pathname.replace(/^\/responsive\/(?:360|720|1200|1600|2400)\//i, "").replace(/\.webp$/, "")}${suffix}`;
  }

  try {
    const url = new URL(source);
    const markerIndex = url.pathname.indexOf(SUPABASE_PUBLIC_MARKER);
    if (markerIndex >= 0) {
      const prefix = url.pathname.slice(0, markerIndex + SUPABASE_PUBLIC_MARKER.length);
      const publicObject = url.pathname.slice(markerIndex + SUPABASE_PUBLIC_MARKER.length);
      const slashIndex = publicObject.indexOf("/");
      if (slashIndex > 0) {
        const bucket = publicObject.slice(0, slashIndex);
        const objectPath = publicObject.slice(slashIndex + 1);
        if (bucket === "site-media") {
          const originalPath = originalObjectPath(objectPath);
          if (originalPath !== objectPath) {
            url.pathname = `${prefix}${bucket}/${originalPath}`;
            return url.toString();
          }
        }
      }
    }

    if (SITE_HOSTS.has(url.hostname)) {
      if (url.pathname.startsWith("/thumbnails/") && url.pathname.endsWith(".webp")) {
        url.pathname = `/${url.pathname.slice("/thumbnails/".length).replace(/\.webp$/, "")}`;
        return url.toString();
      }
      if (/^\/responsive\/(?:360|720|1200|1600|2400)\//i.test(url.pathname) && url.pathname.endsWith(".webp")) {
        url.pathname = `/${url.pathname.replace(/^\/responsive\/(?:360|720|1200|1600|2400)\//i, "").replace(/\.webp$/, "")}`;
        return url.toString();
      }
    }
  } catch {
    return source;
  }
  return source;
}

export type ResponsiveImageAttributes = {
  src: string;
  srcSet?: string;
};

function localResponsiveSrcSet(source: string): string {
  const { pathname, suffix } = splitUrlSuffix(source);
  const originalPath = pathname.replace(/^\/+/, "");
  return RESPONSIVE_IMAGE_WIDTHS.map((width) => {
    const candidate = width === 720
      ? `/thumbnails/${originalPath}.webp${suffix}`
      : `/responsive/${width}/${originalPath}.webp${suffix}`;
    return `${candidate} ${width}w`;
  }).join(", ");
}

export function responsiveImageAttributes(source?: string | null): ResponsiveImageAttributes {
  if (!source) return { src: "" };
  if (/^(?:data|blob):/i.test(source) || !RASTER_EXTENSION.test(source)) return { src: source };

  const original = originalImageUrl(source) || source;
  const importedSrcSet = resolveImportedResponsiveSrcSet(original)
    || resolveImportedResponsiveSrcSet(source);
  if (importedSrcSet) {
    return {
      src: resolveImportedThumbnail(original) || thumbnailUrl(original) || original,
      srcSet: importedSrcSet,
    };
  }

  if (original.startsWith("/")) {
    if (original.startsWith("/assets/")) return { src: source };
    return { src: thumbnailUrl(original) || original, srcSet: localResponsiveSrcSet(original) };
  }

  try {
    const url = new URL(original);
    const markerIndex = url.pathname.indexOf(SUPABASE_PUBLIC_MARKER);
    if (markerIndex >= 0) {
      const prefix = url.pathname.slice(0, markerIndex + SUPABASE_PUBLIC_MARKER.length);
      const publicObject = url.pathname.slice(markerIndex + SUPABASE_PUBLIC_MARKER.length);
      const slashIndex = publicObject.indexOf("/");
      if (slashIndex > 0) {
        const bucket = publicObject.slice(0, slashIndex);
        const objectPath = publicObject.slice(slashIndex + 1);
        if (bucket === "site-media") {
          const originalPath = originalObjectPath(objectPath);
          const srcSet = RESPONSIVE_IMAGE_WIDTHS.map((width) => {
            const candidate = new URL(url.toString());
            candidate.pathname = `${prefix}${bucket}/${responsiveVariantObjectPath(originalPath, width)}`;
            return `${candidate.toString()} ${width}w`;
          }).join(", ");
          const src = new URL(url.toString());
          src.pathname = `${prefix}${bucket}/${thumbnailObjectPath(originalPath)}`;
          return { src: src.toString(), srcSet };
        }
      }
    }

    if (SITE_HOSTS.has(url.hostname) && !url.pathname.startsWith("/assets/")) {
      return { src: thumbnailUrl(original) || original, srcSet: localResponsiveSrcSet(url.pathname + url.search + url.hash) };
    }
  } catch {
    return { src: source };
  }
  return { src: source };
}

export type BrowserThumbnail = {
  blob: Blob;
  width: number;
  height: number;
  mimeType: "image/webp";
};

export type BrowserImageVariant = BrowserThumbnail & {
  targetWidth: ResponsiveImageWidth;
};

async function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
}

function qualityForBrowserWidth(width: ResponsiveImageWidth, requested: number) {
  const floor = width >= 1600 ? 0.88 : width >= 1200 ? 0.85 : width >= 720 ? 0.82 : 0.78;
  return Math.max(floor, requested);
}

export async function createBrowserImageVariants(
  source: Blob,
  options: { widths?: readonly ResponsiveImageWidth[]; quality?: number } = {},
): Promise<BrowserImageVariant[]> {
  if (!source.type.startsWith("image/") || typeof document === "undefined") return [];
  const widths = Array.from(new Set(options.widths ?? RESPONSIVE_IMAGE_WIDTHS))
    .filter((width): width is ResponsiveImageWidth => RESPONSIVE_IMAGE_WIDTHS.includes(width as ResponsiveImageWidth))
    .sort((a, b) => a - b);
  const requestedQuality = Math.max(0.65, Math.min(0.92, options.quality ?? 0.82));
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;

  try {
    if (typeof createImageBitmap === "function") bitmap = await createImageBitmap(source);
    else image = await loadImageElement(source);
    const sourceWidth = bitmap?.width ?? image?.naturalWidth ?? 0;
    const sourceHeight = bitmap?.height ?? image?.naturalHeight ?? 0;
    if (sourceWidth < 1 || sourceHeight < 1) return [];

    const variants: BrowserImageVariant[] = [];
    for (const targetWidth of widths) {
      const width = targetWidth;
      const height = Math.max(1, Math.round(sourceHeight * (targetWidth / sourceWidth)));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) return [];
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap ?? image!, 0, 0, width, height);
      const blob = await encodeCanvas(canvas, qualityForBrowserWidth(targetWidth, requestedQuality));
      if (!blob) return [];
      variants.push({ blob, width, height, mimeType: "image/webp", targetWidth });
    }
    return variants;
  } finally {
    bitmap?.close();
  }
}

export async function createBrowserThumbnail(
  source: Blob,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<BrowserThumbnail | null> {
  if (!source.type.startsWith("image/") || typeof document === "undefined") return null;
  const maxEdge = Math.max(160, Math.min(1600, options.maxEdge ?? 720));
  const quality = Math.max(0.65, Math.min(0.92, options.quality ?? 0.82));
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;

  try {
    if (typeof createImageBitmap === "function") bitmap = await createImageBitmap(source);
    else image = await loadImageElement(source);
    const sourceWidth = bitmap?.width ?? image?.naturalWidth ?? 0;
    const sourceHeight = bitmap?.height ?? image?.naturalHeight ?? 0;
    if (sourceWidth < 1 || sourceHeight < 1) return null;
    const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap ?? image!, 0, 0, width, height);
    const blob = await encodeCanvas(canvas, quality);
    if (!blob) return null;
    return { blob, width, height, mimeType: "image/webp" };
  } finally {
    bitmap?.close();
  }
}
