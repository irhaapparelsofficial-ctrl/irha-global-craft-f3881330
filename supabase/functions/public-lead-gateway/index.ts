import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SITE_URL = "https://irhaapparels.com";
const TECH_PACK_BUCKET = "tech_packs";
const MOCKUP_BUCKET = "mockup-uploads";
const MAX_TECH_PACK_BYTES = 25 * 1024 * 1024;
const MAX_MOCKUP_BYTES = 10 * 1024 * 1024;

type UploadRule = {
  contentType: string;
  aliases: string[];
};

const TECH_PACK_UPLOADS: Record<string, UploadRule> = {
  pdf: { contentType: "application/pdf", aliases: ["application/pdf"] },
  ai: {
    contentType: "application/vnd.adobe.illustrator",
    aliases: ["", "application/octet-stream", "application/pdf", "application/postscript", "application/illustrator", "application/vnd.adobe.illustrator"],
  },
  eps: {
    contentType: "application/postscript",
    aliases: ["", "application/octet-stream", "application/postscript", "application/eps", "application/x-eps"],
  },
  zip: {
    contentType: "application/zip",
    aliases: ["", "application/octet-stream", "application/zip", "application/x-zip-compressed", "multipart/x-zip"],
  },
  png: { contentType: "image/png", aliases: ["image/png"] },
  jpg: { contentType: "image/jpeg", aliases: ["image/jpeg"] },
  jpeg: { contentType: "image/jpeg", aliases: ["image/jpeg"] },
  webp: { contentType: "image/webp", aliases: ["image/webp"] },
};

const MOCKUP_UPLOADS: Record<string, UploadRule> = {
  pdf: { contentType: "application/pdf", aliases: ["application/pdf"] },
  jpg: { contentType: "image/jpeg", aliases: ["image/jpeg"] },
  jpeg: { contentType: "image/jpeg", aliases: ["image/jpeg"] },
  png: { contentType: "image/png", aliases: ["image/png"] },
  webp: { contentType: "image/webp", aliases: ["image/webp"] },
};

type JsonRecord = Record<string, unknown>;
type GatewayAction = "submit_inquiry" | "submit_catalogue" | "create_upload";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, headers);

  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) return json({ error: "Invalid JSON body" }, 400, headers);

    const action = body.action;
    if (!isGatewayAction(action)) return json({ error: "Unsupported action" }, 400, headers);

    const payload = isRecord(body.payload) ? body.payload : body;
    if (text(payload.website, 300)) return json({ ok: true, reference: "received" }, 200, headers);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const fingerprint = await requestFingerprint(req);
    const limit = action === "create_upload" ? 12 : action === "submit_catalogue" ? 5 : 6;
    const { data: allowed, error: limitError } = await service.rpc("consume_public_submission_limit", {
      _fingerprint_hash: fingerprint,
      _action: action,
      _window_seconds: 15 * 60,
      _max_count: limit,
    });
    if (limitError) throw new Error(`Rate-limit check failed: ${limitError.message}`);
    if (!allowed) {
      return json({ error: "Too many requests. Please try again later." }, 429, {
        ...headers,
        "Retry-After": "900",
      });
    }

    if (tooFast(payload.form_started_at)) {
      if (action === "create_upload") return json({ error: "Upload request rejected" }, 400, headers);
      return json({ ok: true, reference: "received" }, 200, headers);
    }

    if (action === "submit_inquiry") return await submitInquiry(service, payload, headers);
    if (action === "submit_catalogue") return await submitCatalogue(service, payload, headers);
    return await createUpload(service, payload, headers);
  } catch (error) {
    console.error("public-lead-gateway error", error instanceof Error ? error.message : error);
    return json({ error: "Request could not be processed" }, 500, headers);
  }
});

async function submitInquiry(
  service: ReturnType<typeof createClient>,
  payload: JsonRecord,
  headers: Record<string, string>,
) {
  const kind = oneOf(text(payload.kind, 40), ["inquiry", "connect", "quote", "mockup"]) ?? "inquiry";
  const name = text(payload.name, 100);
  const email = normalizeEmail(payload.email);
  const phone = text(payload.phone ?? payload.whatsapp, 40);
  const company = text(payload.company, 160);
  const country = text(payload.country, 80);
  const category = text(payload.category, 180);
  const quantity = text(payload.quantity, 100);
  const message = multiline(payload.message, 12000);
  const source = text(payload.source, 240) || `public-${kind}`;
  const intent = text(payload.intent, 50) || (kind === "mockup" ? "reference" : kind === "quote" ? "rfq" : null);
  const incomingContext = safeObject(payload.lead_context, 50_000);
  const contextConsent = isRecord(incomingContext.consent) && incomingContext.consent.given === true;
  const hasConsent = payload.consent === true || contextConsent;

  if (name.length < 2) return json({ error: "Name is required" }, 400, headers);
  if (!email && !phone) return json({ error: "Email or WhatsApp is required" }, 400, headers);
  if (["inquiry", "quote", "mockup"].includes(kind) && !email) {
    return json({ error: "A valid email is required" }, 400, headers);
  }
  if (kind === "inquiry" && (!company || !country)) {
    return json({ error: "Company and country are required" }, 400, headers);
  }
  if (source === "inquiry-wizard" && !hasConsent) {
    return json({ error: "Consent is required before submission" }, 400, headers);
  }

  const requestedRef = text(payload.inquiry_ref, 80).toUpperCase();
  const inquiryRef = /^(?:IRHA-[0-9]{4}-[0-9]{6}|IRQ-[A-Z0-9]+-[A-Z0-9]+)$/.test(requestedRef)
    ? requestedRef
    : createInquiryReference();

  const files = normalizeFiles(payload.files);
  if (files.length > 0 && !(await uploadedFilesExist(service, files))) {
    return json({ error: "One or more private uploads could not be verified. Re-upload the file and retry." }, 400, headers);
  }
  const items = normalizeItems(payload.items);
  const leadContext = {
    ...incomingContext,
    gateway: {
      kind,
      received_at: new Date().toISOString(),
      server_validated: true,
    },
    uploaded_files: files,
    inquiry_items: items,
  };

  if (items.length > 0) {
    const relationalPayload: JsonRecord = {
      ...payload,
      name,
      email,
      phone,
      company,
      country,
      category,
      message,
      source,
      files,
      items,
      lead_context: leadContext,
    };
    const { data, error } = await service.rpc("submit_b2b_inquiry", {
      _payload: relationalPayload,
    }).single();

    if (error) {
      if (error.code === "23505" && error.message.toLowerCase().includes("inquiry_ref")) {
        return json({ ok: true, reference: inquiryRef, duplicate: true }, 200, headers);
      }
      throw new Error(`Relational inquiry insert failed: ${error.message}`);
    }
    const reference = isRecord(data) ? text(data.inquiry_ref, 80) : "";
    return json({ ok: true, reference: reference || inquiryRef }, 200, headers);
  }

  const { data, error } = await service.from("inquiries").insert({
    name,
    email,
    company: company || null,
    country: country || null,
    phone: phone || null,
    category: category || null,
    quantity: quantity || null,
    message: message || null,
    source,
    intent,
    lead_context: leadContext,
    inquiry_ref: inquiryRef,
    tech_pack_paths: files
      .filter((file) => file.path.startsWith("requests/tech-pack/"))
      .map((file) => file.path),
  }).select("inquiry_ref").single();

  if (error) {
    if (error.code === "23505" && error.message.toLowerCase().includes("inquiry_ref")) {
      return json({ ok: true, reference: inquiryRef, duplicate: true }, 200, headers);
    }
    throw new Error(`Inquiry insert failed: ${error.message}`);
  }

  return json({ ok: true, reference: text(data?.inquiry_ref, 80) || inquiryRef }, 200, headers);
}

async function submitCatalogue(
  service: ReturnType<typeof createClient>,
  payload: JsonRecord,
  headers: Record<string, string>,
) {
  const name = text(payload.name, 100);
  const email = normalizeEmail(payload.email);
  const whatsapp = text(payload.whatsapp ?? payload.phone, 40);
  if (name.length < 2) return json({ error: "Name is required" }, 400, headers);
  if (!email && !whatsapp) return json({ error: "Email or WhatsApp is required" }, 400, headers);

  const catalogueUrl = safePublicUrl(payload.catalogue_url);
  const { data, error } = await service.from("catalogue_leads").insert({
    name,
    whatsapp: whatsapp || null,
    email,
    company_name: text(payload.company_name ?? payload.company, 160) || null,
    country: text(payload.country, 80) || null,
    category_interest: text(payload.category_interest, 180) || null,
    message: multiline(payload.message, 6000) || null,
    catalogue_url: catalogueUrl,
    source: text(payload.source, 240) || "public-catalogue",
    utm_source: text(payload.utm_source, 160) || null,
    utm_medium: text(payload.utm_medium, 160) || null,
    utm_campaign: text(payload.utm_campaign, 200) || null,
    language: text(payload.language, 20) || "en",
  }).select("id").single();

  if (error) throw new Error(`Catalogue lead insert failed: ${error.message}`);
  return json({ ok: true, reference: data.id }, 200, headers);
}

async function createUpload(
  service: ReturnType<typeof createClient>,
  payload: JsonRecord,
  headers: Record<string, string>,
) {
  const requestedPurpose = text(payload.purpose, 30);
  const isMockup = requestedPurpose === "mockup";
  const purpose = isMockup ? "mockup" : "tech-pack";
  const filename = text(payload.filename, 240);
  const mime = text(payload.mime, 100).toLowerCase();
  const size = Number(payload.size);
  const extension = fileExtension(filename);
  const rules = isMockup ? MOCKUP_UPLOADS : TECH_PACK_UPLOADS;
  const rule = rules[extension];
  const maxBytes = isMockup ? MAX_MOCKUP_BYTES : MAX_TECH_PACK_BYTES;
  const bucket = isMockup ? MOCKUP_BUCKET : TECH_PACK_BUCKET;

  if (!filename || !rule || !rule.aliases.includes(mime)) {
    const allowed = isMockup ? "PDF, JPG, PNG and WEBP" : "PDF, AI, EPS, ZIP, PNG, JPG and WEBP";
    return json({ error: `Only ${allowed} files are allowed` }, 400, headers);
  }
  if (!Number.isFinite(size) || size < 1 || size > maxBytes) {
    return json({ error: `File must be between 1 byte and ${Math.round(maxBytes / 1024 / 1024)} MB` }, 400, headers);
  }

  const month = new Date().toISOString().slice(0, 7);
  const path = `requests/${purpose}/${month}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await service.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data?.token) throw new Error(`Signed upload could not be created: ${error?.message ?? "missing token"}`);

  return json({
    ok: true,
    bucket,
    path,
    token: data.token,
    content_type: rule.contentType,
    max_size: maxBytes,
  }, 200, headers);
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap((item) => {
    if (!isRecord(item)) return [];
    const slug = text(item.slug, 180);
    const name = text(item.name, 240);
    const categorySlug = text(item.category_slug ?? item.categorySlug, 180);
    const quantity = Number(item.target_quantity ?? item.targetQuantity);
    if (!slug || !name || !Number.isInteger(quantity) || quantity < 1 || quantity > 10_000_000) return [];
    return [{
      slug,
      name,
      category_slug: categorySlug || null,
      target_quantity: quantity,
      size_breakdown: multiline(item.size_breakdown ?? item.sizeBreakdown, 1000) || null,
      notes: multiline(item.notes, 2000) || null,
    }];
  });
}

function normalizeFiles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).flatMap((item) => {
    if (!isRecord(item)) return [];
    const path = text(item.path, 500);
    const name = text(item.name, 240);
    const mime = text(item.mime, 100);
    const size = Number(item.size);
    const validPath = path.startsWith("requests/tech-pack/") ||
      path.startsWith("requests/mockup/") ||
      path.startsWith("requests/inquiry/");
    if (!validPath || !name || !Number.isFinite(size) || size < 1 || size > MAX_TECH_PACK_BYTES) return [];
    return [{ path, name, mime, size }];
  });
}

function uploadBucketForPath(path: string) {
  if (path.startsWith("requests/tech-pack/")) return TECH_PACK_BUCKET;
  if (path.startsWith("requests/mockup/")) return MOCKUP_BUCKET;
  if (path.startsWith("requests/inquiry/")) return "inquiry-uploads";
  return null;
}

async function uploadedFilesExist(
  service: ReturnType<typeof createClient>,
  files: Array<{ path: string; name: string; mime: string; size: number }>,
) {
  for (const file of files) {
    const bucket = uploadBucketForPath(file.path);
    const slash = file.path.lastIndexOf("/");
    if (!bucket || slash < 1) return false;
    const folder = file.path.slice(0, slash);
    const objectName = file.path.slice(slash + 1);
    const { data, error } = await service.storage.from(bucket).list(folder, {
      limit: 20,
      search: objectName,
    });
    if (error) {
      console.error("public-lead-gateway upload verification failed", error.message);
      return false;
    }
    const stored = data?.find((object) => object.name === objectName);
    if (!stored) return false;
    const storedSize = Number(stored.metadata?.size);
    if (Number.isFinite(storedSize) && storedSize > 0 && storedSize !== file.size) return false;
  }
  return true;
}

function createInquiryReference() {
  const digits = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return `IRHA-${new Date().getUTCFullYear()}-${digits.toString().padStart(6, "0")}`;
}

async function requestFingerprint(req: Request) {
  const ip = (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown"
  ).trim();
  const userAgent = (req.headers.get("user-agent") || "unknown").slice(0, 300);
  const pepper = Deno.env.get("PUBLIC_SUBMISSION_PEPPER") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 48) ||
    "irha";
  const bytes = new TextEncoder().encode(`${pepper}|${ip}|${userAgent}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeObject(value: unknown, maxBytes: number): JsonRecord {
  if (!isRecord(value)) return {};
  const encoded = JSON.stringify(value);
  if (encoded.length > maxBytes) return {};
  return JSON.parse(encoded) as JsonRecord;
}

function normalizeEmail(value: unknown): string | null {
  const email = text(value, 254).toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function safePublicUrl(value: unknown): string | null {
  const raw = text(value, 1000);
  if (!raw) return null;
  try {
    const url = new URL(raw, SITE_URL);
    if (url.protocol !== "https:") return null;
    const allowedHost = url.hostname === "irhaapparels.com" || url.hostname === "www.irhaapparels.com";
    return allowedHost ? url.toString().slice(0, 1000) : null;
  } catch {
    return null;
  }
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function multiline(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

function oneOf<T extends string>(value: string, options: readonly T[]): T | null {
  return options.includes(value as T) ? value as T : null;
}

function fileExtension(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return extension.replace(/[^a-z0-9]/g, "");
}

function tooFast(value: unknown) {
  const started = Number(value);
  return Number.isFinite(started) && started > 0 && Date.now() - started < 700;
}

function isGatewayAction(value: unknown): value is GatewayAction {
  return value === "submit_inquiry" || value === "submit_catalogue" || value === "create_upload";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAllowedOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return false;
    return url.hostname === "irhaapparels.com" ||
      url.hostname === "www.irhaapparels.com" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : SITE_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}
