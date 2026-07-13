import { resolveImportedThumbnail } from "@/lib/assetResolver";

const STATIC_ALREADY_THUMBNAIL = /^\/(?:thumbnails|catalogs\/thumbs)\//i;
const RASTER_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i;
const SUPABASE_PUBLIC_MARKER = "/storage/v1/object/public/";
const SITE_HOSTS = new Set(["irhaapparels.com", "www.irhaapparels.com"]);

function splitUrlSuffix(value: string) {
  const match = value.match(/^([^?#]*)(.*)$/);
  return { pathname: match?.[1] ?? value, suffix: match?.[2] ?? "" };
}

export function thumbnailObjectPath(objectPath: string): string {
  const clean = objectPath.replace(/^\/+/, "");
  if (clean.startsWith("thumbnails/")) return clean;
  return `thumbnails/${clean}.webp`;
}

export function thumbnailUrl(source?: string | null): string {
  if (!source) return "";
  if (/^(?:data|blob):/i.test(source) || !RASTER_EXTENSION.test(source)) return source;
  if (STATIC_ALREADY_THUMBNAIL.test(source)) return source;

  const importedThumbnail = resolveImportedThumbnail(source);
  if (importedThumbnail) return importedThumbnail;

  if (source.startsWith("/")) {
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
        if (bucket === "site-media" && objectPath.startsWith("thumbnails/") && objectPath.endsWith(".webp")) {
          url.pathname = `${prefix}${bucket}/${objectPath.slice("thumbnails/".length).replace(/\.webp$/, "")}`;
          return url.toString();
        }
      }
    }

    if (SITE_HOSTS.has(url.hostname) && url.pathname.startsWith("/thumbnails/") && url.pathname.endsWith(".webp")) {
      url.pathname = `/${url.pathname.slice("/thumbnails/".length).replace(/\.webp$/, "")}`;
      return url.toString();
    }
  } catch {
    return source;
  }

  return source;
}

export type BrowserThumbnail = {
  blob: Blob;
  width: number;
  height: number;
  mimeType: "image/webp";
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

export async function createBrowserThumbnail(
  source: Blob,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<BrowserThumbnail | null> {
  if (!source.type.startsWith("image/") || typeof document === "undefined") return null;

  const maxEdge = Math.max(160, Math.min(1600, options.maxEdge ?? 720));
  const quality = Math.max(0.45, Math.min(0.92, options.quality ?? 0.76));
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;

  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(source);
    } else {
      image = await loadImageElement(source);
    }

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

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });
    if (!blob) return null;
    return { blob, width, height, mimeType: "image/webp" };
  } finally {
    bitmap?.close();
  }
}
