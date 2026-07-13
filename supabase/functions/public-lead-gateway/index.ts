import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SITE_URL = "https://irhaapparels.com";
const PRIVATE_UPLOAD_BUCKET = "inquiry-uploads";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOADS: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
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
    const honeypot = text(payload.website, 300);
    if (honeypot) return json({ ok: true, reference: "received" }, 200, headers);

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

  if (name.length < 2) return json({ error: "Name is required" }, 400, headers);
  if (!email && !phone) return json({ error: "Email or WhatsApp is required" }, 400, headers);
  if (["inquiry", "quote", "mockup"].includes(kind) && !email) {
    return json({ error: "A valid email is required" }, 400, headers);
  }
  if (kind === "inquiry" && (!company || !country)) {
    return json({ error: "Company and country are required" }, 400, headers);
  }

  const requestedRef = text(payload.inquiry_ref, 80);
  const inquiryRef = /^IRQ-[A-Z0-9-]{6,70}$/.test(requestedRef)
    ? requestedRef
    : `IRQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  const files = normalizeFiles(payload.files);
  const incomingContext = safeObject(payload.lead_context, 50_000);
  const leadContext = {
    ...incomingContext,
    gateway: {
      kind,
      received_at: new Date().toISOString(),
      server_validated: true,
    },
    uploaded_files: files,
  };

  const { error } = await service.from("inquiries").insert({
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
  });

  if (error) {
    if (error.code === "23505" && error.message.toLowerCase().includes("inquiry_ref")) {
      return json({ ok: true, reference: inquiryRef, duplicate: true }, 200, headers);
    }
    throw new Error(`Inquiry insert failed: ${error.message}`);
  }

  return json({ ok: true, reference: inquiryRef }, 200, headers);
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
  const purpose = oneOf(text(payload.purpose, 30), ["inquiry", "mockup"]) ?? "inquiry";
  const filename = text(payload.filename, 240);
  const mime = text(payload.mime, 100).toLowerCase();
  const size = Number(payload.size);
  const extension = fileExtension(filename);
  const allowedMimes = ALLOWED_UPLOADS[extension];

  if (!filename || !allowedMimes || !allowedMimes.includes(mime)) {
    return json({ error: "Only PDF, JPG, PNG and WEBP files are allowed" }, 400, headers);
  }
  if (!Number.isFinite(size) || size < 1 || size > MAX_UPLOAD_BYTES) {
    return json({ error: "File must be between 1 byte and 10 MB" }, 400, headers);
  }

  const month = new Date().toISOString().slice(0, 7);
  const path = `requests/${purpose}/${month}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await service.storage.from(PRIVATE_UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error || !data?.token) throw new Error(`Signed upload could not be created: ${error?.message ?? "missing token"}`);

  return json({
    ok: true,
    bucket: PRIVATE_UPLOAD_BUCKET,
    path,
    token: data.token,
    max_size: MAX_UPLOAD_BYTES,
  }, 200, headers);
}

async function requestFingerprint(req: Request) {
  const ip = (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown"
  ).trim();
  const userAgent = (req.headers.get("user-agent") || "unknown").slice(0, 300);
  const pepper = Deno.env.get("PUBLIC_SUBMISSION_PEPPER") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 48) || "irha";
  const bytes = new TextEncoder().encode(`${pepper}|${ip}|${userAgent}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeFiles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).flatMap((item) => {
    if (!isRecord(item)) return [];
    const path = text(item.path, 500);
    const name = text(item.name, 240);
    const mime = text(item.mime, 100);
    const size = Number(item.size);
    if (!path.startsWith("requests/") || !name || !Number.isFinite(size) || size < 1 || size > MAX_UPLOAD_BYTES) return [];
    return [{ path, name, mime, size }];
  });
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
    const allowedHost = url.hostname === "irhaapparels.com" ||
      url.hostname === "www.irhaapparels.com" ||
      url.hostname.endsWith(".lovable.app");
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
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
