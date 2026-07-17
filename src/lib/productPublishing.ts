import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createBrowserImageVariants,
  RESPONSIVE_IMAGE_WIDTHS,
  responsiveVariantObjectPath,
  thumbnailObjectPath,
  type BrowserImageVariant,
} from "@/lib/imageThumbnails";

export const PRODUCT_MEDIA_BUCKET = "site-media";
export const PRODUCT_MEDIA_MAX_BYTES = 25 * 1024 * 1024;
export const PRODUCT_MEDIA_MAX_FILES = 10;
export const PRODUCT_MEDIA_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMMUTABLE_CACHE_SECONDS = "31536000";
const SITE_URL = "https://irhaapparels.com";

export type CategoryRef = {
  id: string;
  slug: string;
  parent_id: string | null;
};

export type TaxonomyNodeRef = {
  id: string;
  node_type: string;
  depth: number;
  slug: string;
  name?: string;
  full_slug_path: string;
};

export type ProductSlugRef = {
  id: string;
  category_id: string;
  slug: string;
};

export type UploadedProductMedia = {
  publicUrl: string;
  mediaAssetId: string;
  objectPaths: string[];
};

export type ProductUrlAuditRow = {
  slug: string | null;
  image_url: string | null;
  gallery: string[] | null;
  category_id: string | null;
};

const ROOT_REFERENCE_CODES: Record<string, string> = {
  "bavarian-trachten-wear": "BAV",
  "sportswear": "SPT",
  "premium-leather-apparel": "LTH",
  "streetwear-activewear": "STW",
  "leisure-nightwear": "LNW",
};

const PRODUCT_TYPE_REFERENCE_CODES: Record<string, string> = {
  lederhosen: "LDH",
  "short-lederhosen": "SLH",
  bundhosen: "BDH",
  "knee-length-lederhosen": "KLH",
  "long-leather-trousers": "LLT",
  "trachten-shirts": "TSH",
  "trachten-vests": "TVS",
  "bavarian-jackets": "BJK",
  dirndl: "DRD",
  "dirndl-dresses": "DRD",
  "dirndl-blouses": "DBL",
  "dirndl-aprons": "DAP",
  "football-uniforms": "FBJ",
  "football-kits": "FBJ",
  "soccer-uniforms": "FBJ",
  "basketball-uniforms": "BBJ",
  "baseball-uniforms": "BSJ",
  "rugby-kits": "RGJ",
  "cricket-uniforms": "CKU",
  "hockey-jerseys": "HKJ",
  tracksuits: "TRK",
  "training-wear": "TRN",
  "biker-jackets": "BJK",
  "bomber-jackets": "BMJ",
  "leather-vests": "LVS",
  "leather-pants": "LPT",
  hoodies: "HOD",
  "t-shirts": "TSH",
  joggers: "JGR",
  "cargo-pants": "CGP",
  activewear: "ACT",
  leggings: "LEG",
  "sports-bras": "SBR",
  pajamas: "PJM",
  "pajama-sets": "PJM",
  nightwear: "NGT",
  loungewear: "LNG",
  robes: "ROB",
};

export function slugifyProductName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeProductReferenceCode(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function fallbackReferenceSegment(slug: string) {
  const tokens = slugifyProductName(slug).split("-").filter(Boolean);
  if (tokens.length >= 2) return tokens.slice(0, 3).map((token) => token[0]).join("").toUpperCase();
  const token = tokens[0] ?? "PRD";
  const consonants = token.replace(/[aeiou]/g, "");
  return (consonants.slice(0, 3) || token.slice(0, 3) || "PRD").padEnd(3, "X").toUpperCase();
}

export function productReferencePrefix(taxonomyPath: string) {
  const segments = taxonomyPath.split("/").filter(Boolean);
  const root = ROOT_REFERENCE_CODES[segments[0]] ?? fallbackReferenceSegment(segments[0] ?? "product");
  const leafSlug = segments.at(-1) ?? "product";
  const leaf = PRODUCT_TYPE_REFERENCE_CODES[leafSlug] ?? fallbackReferenceSegment(leafSlug);
  return `IRHA-${root}-${leaf}`;
}

export function suggestProductReferenceCode(taxonomyPath: string, existingCodes: Array<string | null | undefined>) {
  const prefix = productReferencePrefix(taxonomyPath);
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d{4})$`);
  const highest = existingCodes.reduce((max, value) => {
    const normalized = normalizeProductReferenceCode(value ?? "");
    const match = normalized.match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(4, "0")}`;
}

export function nextAvailableProductSlug(
  requestedValue: string,
  productName: string,
  categoryId: string,
  existing: ProductSlugRef[],
  currentProductId?: string,
) {
  const base = slugifyProductName(requestedValue) || slugifyProductName(productName) || "product";
  const occupied = new Set(
    existing
      .filter((row) => row.category_id === categoryId && row.id !== currentProductId)
      .map((row) => row.slug),
  );
  if (!occupied.has(base)) return base;
  let suffix = 2;
  while (occupied.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function topLevelCategorySlug(categories: CategoryRef[], categoryId: string) {
  const category = categories.find((row) => row.id === categoryId);
  if (!category) return null;
  if (!category.parent_id) return category.slug;
  return categories.find((row) => row.id === category.parent_id)?.slug ?? null;
}

export function productPublicUrl(categories: CategoryRef[], categoryId: string, productSlug: string) {
  const parentSlug = topLevelCategorySlug(categories, categoryId);
  if (!parentSlug || !productSlug) return null;
  return `${SITE_URL}/products/${parentSlug}/${productSlug}`;
}

export function taxonomyProductPublicUrl(node: TaxonomyNodeRef | null | undefined, productSlug: string) {
  if (!node || node.depth !== 2 || node.node_type !== "product_type" || !node.full_slug_path || !productSlug) return null;
  return `${SITE_URL}/products/${node.full_slug_path}/${productSlug}`;
}

export function taxonomyNodeMatchesCategory(
  node: TaxonomyNodeRef,
  categories: CategoryRef[],
  categoryId: string,
) {
  const rootSlug = topLevelCategorySlug(categories, categoryId);
  return Boolean(rootSlug && node.full_slug_path.startsWith(`${rootSlug}/`));
}

export function auditProductUrls(rows: ProductUrlAuditRow[], categories: CategoryRef[]) {
  const missingProductUrl = rows.filter(
    (row) => !row.slug || !row.category_id || !productPublicUrl(categories, row.category_id, row.slug),
  ).length;
  const missingCoverUrl = rows.filter((row) => !row.image_url?.trim()).length;
  const missingGalleryUrl = rows.filter((row) => !row.gallery || row.gallery.filter(Boolean).length === 0).length;
  return {
    total: rows.length,
    missingProductUrl,
    missingCoverUrl,
    missingGalleryUrl,
    complete: rows.length - new Set([
      ...rows.map((row, index) => (!row.slug || !row.category_id || !productPublicUrl(categories, row.category_id, row.slug) ? index : -1)),
      ...rows.map((row, index) => (!row.image_url?.trim() ? index : -1)),
      ...rows.map((row, index) => (!row.gallery || row.gallery.filter(Boolean).length === 0 ? index : -1)),
    ].filter((index) => index >= 0)).size,
  };
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function optimizedMetadata(bucket: string, originalPath: string, variants: BrowserImageVariant[]) {
  const thumbnail = variants.find((variant) => variant.targetWidth === 720);
  if (!thumbnail) throw new Error("The 720px product preview was not generated");
  const thumbnailPath = thumbnailObjectPath(originalPath);
  return {
    thumbnail_bucket: bucket,
    thumbnail_object_path: thumbnailPath,
    thumbnail_width_px: thumbnail.width,
    thumbnail_height_px: thumbnail.height,
    thumbnail_size_bytes: thumbnail.blob.size,
    thumbnail_generated_at: new Date().toISOString(),
    responsive_widths: variants.map((variant) => variant.targetWidth),
    responsive_format: "image/webp",
    responsive_total_size_bytes: variants.reduce((total, variant) => total + variant.blob.size, 0),
    responsive_generated_at: new Date().toISOString(),
  };
}

async function removeStoragePaths(client: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await client.storage.from(PRODUCT_MEDIA_BUCKET).remove(paths);
  if (error) throw error;
}

export async function rollbackUploadedProductMedia(
  client: SupabaseClient,
  uploads: UploadedProductMedia[],
) {
  const mediaIds = uploads.map((item) => item.mediaAssetId).filter(Boolean);
  const objectPaths = uploads.flatMap((item) => item.objectPaths);
  const errors: string[] = [];

  if (mediaIds.length > 0) {
    const { error } = await client.from("media_assets").delete().in("id", mediaIds);
    if (error) errors.push(error.message);
  }
  if (objectPaths.length > 0) {
    try {
      await removeStoragePaths(client, objectPaths);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length > 0) throw new Error(`Upload rollback incomplete: ${errors.join("; ")}`);
}

export async function uploadProductImages(
  client: SupabaseClient,
  files: File[],
  productSlug: string,
  onProgress?: (index: number, state: "optimizing" | "uploading" | "saved") => void,
) {
  if (files.length === 0) return [] as UploadedProductMedia[];
  if (files.length > PRODUCT_MEDIA_MAX_FILES) throw new Error(`Select no more than ${PRODUCT_MEDIA_MAX_FILES} images`);

  const completed: UploadedProductMedia[] = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!PRODUCT_MEDIA_ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name}: use JPG, PNG or WebP`);
      if (file.size > PRODUCT_MEDIA_MAX_BYTES) throw new Error(`${file.name}: maximum size is 25 MB`);

      onProgress?.(index, "optimizing");
      const variants = await createBrowserImageVariants(file);
      if (variants.length !== RESPONSIVE_IMAGE_WIDTHS.length) {
        throw new Error(`${file.name}: responsive image generation failed`);
      }

      onProgress?.(index, "uploading");
      const originalPath = `products/${productSlug}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const objectPaths = [originalPath];
      const { error: originalError } = await client.storage.from(PRODUCT_MEDIA_BUCKET).upload(originalPath, file, {
        cacheControl: IMMUTABLE_CACHE_SECONDS,
        contentType: file.type,
        upsert: false,
      });
      if (originalError) throw originalError;

      try {
        for (const variant of variants) {
          const variantPath = responsiveVariantObjectPath(originalPath, variant.targetWidth);
          const { error } = await client.storage.from(PRODUCT_MEDIA_BUCKET).upload(variantPath, variant.blob, {
            cacheControl: IMMUTABLE_CACHE_SECONDS,
            contentType: variant.mimeType,
            upsert: false,
          });
          if (error) throw error;
          objectPaths.push(variantPath);
        }

        const { data: originalUrlData } = client.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(originalPath);
        const thumbnailPath = thumbnailObjectPath(originalPath);
        const { data: thumbnailUrlData } = client.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(thumbnailPath);
        const metadata = {
          bucket: PRODUCT_MEDIA_BUCKET,
          object_path: originalPath,
          public_url: originalUrlData.publicUrl,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
          alt_text: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
          tags: ["product", productSlug],
          usage_notes: `Product media for ${productSlug}`,
          status: "active",
          ...optimizedMetadata(PRODUCT_MEDIA_BUCKET, originalPath, variants),
          thumbnail_url: thumbnailUrlData.publicUrl,
        };
        const { data: mediaAsset, error: metadataError } = await client
          .from("media_assets")
          .insert(metadata)
          .select("id")
          .single();
        if (metadataError) throw metadataError;

        completed.push({
          publicUrl: originalUrlData.publicUrl,
          mediaAssetId: mediaAsset.id,
          objectPaths,
        });
        onProgress?.(index, "saved");
      } catch (error) {
        await removeStoragePaths(client, objectPaths).catch(() => undefined);
        throw error;
      }
    }
    return completed;
  } catch (error) {
    await rollbackUploadedProductMedia(client, completed).catch(() => undefined);
    throw error;
  }
}
