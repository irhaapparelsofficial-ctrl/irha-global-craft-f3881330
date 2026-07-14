import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CANONICAL_BASE = "https://www.irhaapparels.com";
const LOVABLE_BASE = "https://irha-apparels.lovable.app";
const PREVIEW_BASE = "https://id-preview--da72a40a-7df3-44c3-a72d-f180d9ffcd25.lovable.app";
const BUCKET = "site-media";
const MAX_BATCH = 12;
const MAX_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

type JsonRecord = Record<string, unknown>;
type DbClient = ReturnType<typeof createClient>;

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  gallery: unknown;
  category_id: string | null;
};

type Candidate = {
  source: string;
  productIds: string[];
  productSlugs: string[];
  productNames: string[];
  categorySlugs: string[];
  position: number;
};

type Dimensions = { width: number; height: number };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await auth.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "health";

    if (action === "health") return await health(service);
    if (action === "preview") return await preview(service, body);
    if (action === "import_batch") return await importBatch(service, body);
    if (action === "approve_batch") return await approveBatch(service, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("catalog-media-bootstrap", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: DbClient) {
  const [productCount, totalAssets, importedAssets, approvedAssets] = await Promise.all([
    countRows(service, "products", (query) => query.eq("is_published", true)),
    countRows(service, "media_assets"),
    countRows(service, "media_assets", (query) => query.contains("tags", ["catalog-bootstrap"])),
    countRows(service, "media_assets", (query) => query.contains("tags", ["catalog-bootstrap"]).eq("social_approved", true)),
  ]);
  return json({
    ok: true,
    database_ready: [productCount, totalAssets, importedAssets, approvedAssets].every((item) => item.error === null),
    published_products: productCount.count,
    media_assets: totalAssets.count,
    imported_catalog_assets: importedAssets.count,
    approved_catalog_assets: approvedAssets.count,
    max_batch: MAX_BATCH,
    policy: "Imported assets are technically verified but remain blocked from social use until an admin explicitly approves them.",
    errors: [productCount, totalAssets, importedAssets, approvedAssets].flatMap((item) => item.error ? [item.error] : []),
  });
}

async function preview(service: DbClient, body: JsonRecord) {
  const offset = clamp(body.offset, 0, 100_000, 0);
  const limit = clamp(body.limit, 1, MAX_BATCH, 8);
  const candidates = await loadCandidates(service);
  const slice = candidates.slice(offset, offset + limit);
  return json({
    ok: true,
    total_candidates: candidates.length,
    offset,
    next_offset: offset + slice.length,
    has_more: offset + slice.length < candidates.length,
    candidates: slice.map((candidate) => ({
      source: candidate.source,
      product_names: candidate.productNames,
      product_slugs: candidate.productSlugs,
      category_slugs: candidate.categorySlugs,
      position: candidate.position,
      fetch_candidates: sourceUrls(candidate.source),
    })),
    note: "Preview only. No files or database rows were changed.",
  });
}

async function importBatch(service: DbClient, body: JsonRecord) {
  const offset = clamp(body.offset, 0, 100_000, 0);
  const limit = clamp(body.limit, 1, MAX_BATCH, 8);
  const candidates = await loadCandidates(service);
  const slice = candidates.slice(offset, offset + limit);
  const outcomes: JsonRecord[] = [];

  for (const candidate of slice) {
    try {
      const fetched = await fetchFirst(candidate.source);
      const checksum = await sha256(fetched.bytes);
      const extension = extensionFor(fetched.mimeType, fetched.resolvedUrl);
      const sourceKey = await sha256(new TextEncoder().encode(candidate.source));
      const primarySlug = candidate.productSlugs[0] || "catalog-product";
      const objectPath = `catalog/${safeSegment(primarySlug)}/${sourceKey.slice(0, 20)}-${checksum.slice(0, 12)}.${extension}`;

      const { data: existing } = await service.from("media_assets").select("id,public_url,verification_status,social_approved").eq("object_path", objectPath).maybeSingle();
      if (existing) {
        outcomes.push({ source: candidate.source, status: "skipped_existing", asset_id: existing.id, public_url: existing.public_url });
        continue;
      }

      const dimensions = imageDimensions(fetched.bytes, fetched.mimeType);
      if (!dimensions || dimensions.width < 100 || dimensions.height < 100) {
        throw new Error("Image dimensions could not be verified or are below 100×100");
      }

      const { error: uploadError } = await service.storage.from(BUCKET).upload(objectPath, fetched.bytes, {
        cacheControl: "31536000",
        upsert: false,
        contentType: fetched.mimeType,
      });
      if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw new Error(uploadError.message);

      const { data: publicData } = service.storage.from(BUCKET).getPublicUrl(objectPath);
      const tags = unique([
        "catalog-bootstrap",
        "first-party-catalog",
        ...candidate.productIds,
        ...candidate.productSlugs,
        ...candidate.categorySlugs,
      ]).slice(0, 40);
      const fileName = fileNameFromUrl(fetched.resolvedUrl, extension);
      const { data: asset, error: insertError } = await service.from("media_assets").insert({
        bucket: BUCKET,
        object_path: objectPath,
        public_url: publicData.publicUrl,
        file_name: fileName,
        mime_type: fetched.mimeType,
        size_bytes: fetched.bytes.byteLength,
        title: `${candidate.productNames[0] || "Catalog product"} · catalog image ${candidate.position}`,
        alt_text: candidate.productNames[0] || "Irha Apparels product",
        tags,
        usage_notes: `Imported from the published Irha Apparels catalog. Source: ${fetched.resolvedUrl}. Owner social approval remains required.`,
        status: "active",
        verification_status: "verified",
        width_px: dimensions.width,
        height_px: dimensions.height,
        duration_ms: null,
        checksum_sha256: checksum,
        social_approved: false,
      }).select("id,public_url,verification_status,social_approved,width_px,height_px").single();
      if (insertError || !asset) {
        await service.storage.from(BUCKET).remove([objectPath]);
        throw new Error(insertError?.message || "Media metadata insert returned no row");
      }

      outcomes.push({
        source: candidate.source,
        resolved_url: fetched.resolvedUrl,
        status: "imported_verified",
        asset_id: asset.id,
        public_url: asset.public_url,
        width: asset.width_px,
        height: asset.height_px,
        social_approved: false,
      });
    } catch (error) {
      outcomes.push({ source: candidate.source, status: "failed", error: error instanceof Error ? error.message : String(error) });
    }
  }

  const imported = outcomes.filter((item) => item.status === "imported_verified").length;
  const skipped = outcomes.filter((item) => item.status === "skipped_existing").length;
  const failed = outcomes.filter((item) => item.status === "failed").length;
  return json({
    ok: failed < outcomes.length,
    total_candidates: candidates.length,
    offset,
    processed: slice.length,
    next_offset: offset + slice.length,
    has_more: offset + slice.length < candidates.length,
    imported,
    skipped,
    failed,
    outcomes,
    note: "Imported media is technically verified but not approved for social rendering. Owner approval is still required.",
  }, failed === outcomes.length && outcomes.length > 0 ? 422 : 200);
}

async function approveBatch(service: DbClient, userId: string, body: JsonRecord) {
  const limit = clamp(body.limit, 1, 50, 20);
  const requestedIds = stringArray(body.asset_ids).slice(0, 50);
  let query = service.from("media_assets")
    .select("id")
    .contains("tags", ["catalog-bootstrap"])
    .eq("status", "active")
    .eq("verification_status", "verified")
    .eq("social_approved", false)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (requestedIds.length) query = query.in("id", requestedIds);
  const { data: candidates, error: selectError } = await query;
  if (selectError) return json({ error: selectError.message }, 422);
  const ids = (candidates ?? []).map((item) => item.id);
  if (ids.length === 0) return json({ ok: true, approved: 0, note: "No verified imported assets are waiting for approval." });

  const { data, error } = await service.from("media_assets").update({
    social_approved: true,
    social_approved_by: userId,
  }).in("id", ids).select("id,public_url,social_approved");
  if (error) return json({ error: error.message }, 422);
  return json({
    ok: true,
    approved: data?.length || 0,
    asset_ids: (data ?? []).map((item) => item.id),
    note: "Only the explicitly selected verified first-party catalog assets were approved for social rendering.",
  });
}

async function loadCandidates(service: DbClient): Promise<Candidate[]> {
  const { data: products, error } = await service.from("products")
    .select("id,name,slug,image_url,gallery,category_id")
    .eq("is_published", true)
    .order("name")
    .limit(500);
  if (error) throw new Error(error.message);

  const categoryIds = unique((products ?? []).map((item) => item.category_id).filter((item): item is string => typeof item === "string"));
  const { data: categories } = categoryIds.length
    ? await service.from("categories").select("id,slug").in("id", categoryIds)
    : { data: [] as Array<{ id: string; slug: string }> };
  const categoryMap = new Map((categories ?? []).map((item) => [item.id, item.slug]));
  const grouped = new Map<string, Candidate>();

  for (const raw of products ?? []) {
    const product = raw as ProductRow;
    const values = unique([product.image_url, ...stringArray(product.gallery)].filter((item): item is string => Boolean(item)));
    values.forEach((source, index) => {
      const key = source.trim();
      if (!key || !allowedSource(key)) return;
      const existing = grouped.get(key);
      const categorySlug = product.category_id ? categoryMap.get(product.category_id) : null;
      if (existing) {
        existing.productIds = unique([...existing.productIds, product.id]);
        existing.productSlugs = unique([...existing.productSlugs, product.slug]);
        existing.productNames = unique([...existing.productNames, product.name]);
        existing.categorySlugs = unique([...existing.categorySlugs, ...(categorySlug ? [categorySlug] : [])]);
        return;
      }
      grouped.set(key, {
        source: key,
        productIds: [product.id],
        productSlugs: [product.slug],
        productNames: [product.name],
        categorySlugs: categorySlug ? [categorySlug] : [],
        position: index + 1,
      });
    });
  }
  return [...grouped.values()].sort((left, right) => left.productNames[0].localeCompare(right.productNames[0]) || left.position - right.position || left.source.localeCompare(right.source));
}

async function fetchFirst(source: string) {
  const errors: string[] = [];
  for (const url of sourceUrls(source)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "IrhaCatalogMediaBootstrap/1.0" } });
      if (!response.ok) {
        errors.push(`${url} returned ${response.status}`);
        continue;
      }
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > MAX_BYTES) throw new Error("Source image exceeds the 25 MB limit");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength <= 0 || bytes.byteLength > MAX_BYTES) throw new Error("Source image is empty or exceeds the 25 MB limit");
      const mimeType = normalizeMime(response.headers.get("content-type"), url, bytes);
      if (!IMAGE_MIME_TYPES.has(mimeType)) throw new Error(`Unsupported source MIME type ${mimeType}`);
      return { bytes, mimeType, resolvedUrl: response.url || url };
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(errors.join(" | ").slice(0, 1800) || "No permitted source URL could be fetched");
}

function sourceUrls(source: string) {
  const value = source.trim();
  if (/^https:\/\//i.test(value)) return allowedAbsolute(value) ? [value] : [];
  const path = value.startsWith("/") ? value : `/${value}`;
  const bases = path.startsWith("/__l5e/")
    ? [LOVABLE_BASE, PREVIEW_BASE, CANONICAL_BASE]
    : [CANONICAL_BASE, LOVABLE_BASE, PREVIEW_BASE];
  return bases.map((base) => `${base}${path}`);
}

function allowedSource(source: string) {
  if (source.startsWith("/")) return !source.includes("..") && !source.startsWith("//");
  return allowedAbsolute(source);
}

function allowedAbsolute(source: string) {
  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "irhaapparels.com" || host.endsWith(".irhaapparels.com") || host === "irha-apparels.lovable.app" || host.endsWith("--da72a40a-7df3-44c3-a72d-f180d9ffcd25.lovable.app"));
  } catch {
    return false;
  }
}

function normalizeMime(header: string | null, url: string, bytes: Uint8Array) {
  const value = (header || "").split(";")[0].trim().toLowerCase();
  if (IMAGE_MIME_TYPES.has(value)) return value;
  const lower = url.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".svg")) return "image/svg+xml";
  if (lower.match(/\.jpe?g(?:$|\?)/)) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 0, 3) === "GIF") return "image/gif";
  const prefix = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 500))).trimStart().toLowerCase();
  if (prefix.startsWith("<svg") || prefix.startsWith("<?xml")) return "image/svg+xml";
  return value || "application/octet-stream";
}

function imageDimensions(bytes: Uint8Array, mimeType: string): Dimensions | null {
  if (mimeType === "image/png" && bytes.length >= 24) return { width: u32be(bytes, 16), height: u32be(bytes, 20) };
  if (mimeType === "image/gif" && bytes.length >= 10) return { width: u16le(bytes, 6), height: u16le(bytes, 8) };
  if (mimeType === "image/jpeg") return jpegDimensions(bytes);
  if (mimeType === "image/webp") return webpDimensions(bytes);
  if (mimeType === "image/svg+xml") return svgDimensions(bytes);
  return null;
}

function jpegDimensions(bytes: Uint8Array): Dimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 9 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    if (sof.has(marker) && length >= 7) return { height: (bytes[offset + 3] << 8) | bytes[offset + 4], width: (bytes[offset + 5] << 8) | bytes[offset + 6] };
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): Dimensions | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WEBP") return null;
  const type = ascii(bytes, 12, 16);
  if (type === "VP8X" && bytes.length >= 30) return { width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
  if (type === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b1 = bytes[21], b2 = bytes[22], b3 = bytes[23], b4 = bytes[24];
    return { width: 1 + (((b2 & 0x3f) << 8) | b1), height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)) };
  }
  if (type === "VP8 ") {
    for (let index = 20; index + 9 < bytes.length && index < 80; index += 1) {
      if (bytes[index] === 0x9d && bytes[index + 1] === 0x01 && bytes[index + 2] === 0x2a) {
        return { width: u16le(bytes, index + 3) & 0x3fff, height: u16le(bytes, index + 5) & 0x3fff };
      }
    }
  }
  return null;
}

function svgDimensions(bytes: Uint8Array): Dimensions | null {
  const text = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 100_000)));
  const tag = text.match(/<svg\b[^>]*>/i)?.[0] || "";
  const width = numericAttribute(tag, "width");
  const height = numericAttribute(tag, "height");
  if (width && height) return { width: Math.round(width), height: Math.round(height) };
  const viewBox = tag.match(/\bviewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)\s*["']/i);
  if (viewBox) return { width: Math.round(Number(viewBox[1])), height: Math.round(Number(viewBox[2])) };
  return null;
}

function numericAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']\\s*([\\d.]+)`, "i"));
  const value = Number(match?.[1] || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function countRows(service: DbClient, table: string, modify?: (query: any) => any) {
  let query = service.from(table).select("id", { count: "exact", head: true });
  if (modify) query = modify(query);
  const { count, error } = await query;
  return { count: count || 0, error: error?.message || null };
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function extensionFor(mimeType: string, url: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/svg+xml") return "svg";
  return /\.jpeg(?:$|\?)/i.test(url) ? "jpeg" : "jpg";
}

function fileNameFromUrl(value: string, extension: string) {
  try {
    const name = decodeURIComponent(new URL(value).pathname.split("/").pop() || `catalog-image.${extension}`);
    return safeFileName(name.includes(".") ? name : `${name}.${extension}`);
  } catch {
    return `catalog-image.${extension}`;
  }
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180) || "catalog-image";
}

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "product";
}

function u16le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u24le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function u32be(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  return typeof value === "string" ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) : [];
}

function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, Math.round(number))) : fallback;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
