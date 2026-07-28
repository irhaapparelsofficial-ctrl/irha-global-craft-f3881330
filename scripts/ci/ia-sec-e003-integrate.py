from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    target = Path(path)
    text = target.read_text()
    found = text.count(old)
    if found != count:
        raise SystemExit(f"{path}: expected {count} matches, found {found}: {old[:80]!r}")
    target.write_text(text.replace(old, new, count))


# generate-mockup: preserve renderer implementation and replace only gateway controls.
path = "supabase/functions/generate-mockup/index.ts"
replace(
    path,
    'import "jsr:@supabase/functions-js/edge-runtime.d.ts";\n',
    'import "jsr:@supabase/functions-js/edge-runtime.d.ts";\n'
    'import { createClient } from "npm:@supabase/supabase-js@2.49.4";\n'
    'import {\n'
    '  authorizeDurableRateLimit,\n'
    '  DurableRateLimitUnavailableError,\n'
    '  isValidClientSessionId,\n'
    '  type RateLimitRpcClient,\n'
    '} from "../_shared/durable-rate-limit.ts";\n',
)
replace(
    path,
    'const HEIGHT = 640;\n',
    'const HEIGHT = 640;\n'
    'const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;\n'
    'const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;\n'
    'const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {\n'
    '  auth: { persistSession: false, autoRefreshToken: false },\n'
    '});\n',
)
replace(
    path,
    '''const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const ipHits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.reset < now) {
    ipHits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

''',
    '',
)
replace(
    path,
    '''function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
): Response {
''',
    '''function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
  extraHeaders: Record<string, string> = {},
): Response {
''',
)
replace(
    path,
    '''      "X-Irha-Renderer": "deterministic-png-v1",
    },
''',
    '''      "X-Irha-Renderer": "deterministic-png-v1",
      ...extraHeaders,
    },
''',
)
replace(
    path,
    '''  logoBase64?: unknown;
};
''',
    '''  logoBase64?: unknown;
  clientSessionId?: unknown;
  rateLimitToken?: unknown;
};
''',
)
replace(
    path,
    '''  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  if (rateLimited(ip)) return respond({ error: "preview_rate_limited" }, 429);

''',
    '',
)
replace(
    path,
    '''    const hasLogo = typeof payload.logoBase64 === "string" && payload.logoBase64.startsWith("data:image/") && payload.logoBase64.length <= 2_300_000;

    if (!productName || !/^#[0-9a-fA-F]{6}$/.test(colorHex)) {
      return respond({ error: "invalid_preview_request" }, 400);
    }

    const [frontPng, backPng] = await Promise.all([
''',
    '''    const hasLogo = typeof payload.logoBase64 === "string" && payload.logoBase64.startsWith("data:image/") && payload.logoBase64.length <= 2_300_000;
    const clientSessionId = typeof payload.clientSessionId === "string" ? payload.clientSessionId : "";
    const rateLimitToken = typeof payload.rateLimitToken === "string" ? payload.rateLimitToken.slice(0, 2_000) : null;

    if (!productName || !/^#[0-9a-fA-F]{6}$/.test(colorHex) || !isValidClientSessionId(clientSessionId)) {
      return respond({ error: "invalid_preview_request" }, 400);
    }

    const designIdentity = {
      productId: typeof payload.productId === "string" ? payload.productId.slice(0, 120) : null,
      productName,
      colorHex: colorHex.toLowerCase(),
      placement,
      presetId,
      logo: hasLogo && typeof payload.logoBase64 === "string"
        ? {
          length: payload.logoBase64.length,
          prefix: payload.logoBase64.slice(0, 256),
          suffix: payload.logoBase64.slice(-256),
        }
        : null,
    };

    let limiter;
    try {
      limiter = await authorizeDurableRateLimit({
        client: service as unknown as RateLimitRpcClient,
        request: req,
        secret: SERVICE_ROLE_KEY,
        endpoint: "generate-mockup",
        policyKey: "generate-mockup.generate",
        clientSessionId,
        rateLimitToken,
        resourceValue: designIdentity,
        duplicateValue: designIdentity,
      });
    } catch (error) {
      if (error instanceof DurableRateLimitUnavailableError) {
        return respond({ error: "rate_limit_unavailable" }, 503);
      }
      throw error;
    }

    if (!limiter.allowed || limiter.duplicateSuppressed) {
      return jsonResponse(
        { error: "preview_rate_limited" },
        429,
        headers,
        { "Retry-After": String(Math.max(1, limiter.retryAfterSeconds || 1)) },
      );
    }

    const [frontPng, backPng] = await Promise.all([
''',
)
replace(
    path,
    '''      renderer: "irha-deterministic-png-v1",
    });
''',
    '''      renderer: "irha-deterministic-png-v1",
      rateLimitToken: limiter.rateLimitToken,
    });
''',
)

# live-chat: durable action-specific enforcement before database work.
path = "supabase/functions/live-chat/index.ts"
replace(
    path,
    '''// Coarse edge location is retained for owner context; raw visitor IP addresses
// are used only for in-memory rate limiting and are never persisted.
import { createClient } from "npm:@supabase/supabase-js@2";
''',
    '''// Coarse edge location is retained for owner context. Raw visitor IP addresses
// and forwarding headers are not used as rate-limit identity and are never persisted.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  authorizeDurableRateLimit,
  DurableRateLimitUnavailableError,
  policyForLiveChatAction,
  type RateLimitRpcClient,
} from "../_shared/durable-rate-limit.ts";
''',
)
replace(
    path,
    '''function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
''',
    '''function json(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
  extraHeaders: Record<string, string> = {},
) {
''',
)
replace(
    path,
    '''      "Cache-Control": "no-store",
    },
''',
    '''      "Cache-Control": "no-store",
      ...extraHeaders,
    },
''',
)
replace(
    path,
    '''const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 90;
const ipHits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.reset <= now) {
    ipHits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

''',
    '',
)
replace(
    path,
    '''  const ip = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) return json({ error: "too_many_requests" }, 429, headers);

''',
    '',
)
replace(
    path,
    '''    if (!validSessionId(sessionId) || !validToken(visitorToken)) {
      return json({ error: "invalid_session_credentials" }, 400, headers);
    }

    const geo = readGeoContext(req, body);
''',
    '''    if (!validSessionId(sessionId) || !validToken(visitorToken)) {
      return json({ error: "invalid_session_credentials" }, 400, headers);
    }

    const policyKey = policyForLiveChatAction(action);
    if (!policyKey) return json({ error: "invalid_action" }, 400, headers);
    const clientMessageId = cleanText(body.clientMessageId, 100) || null;
    const normalizedMessage = cleanText(body.message, MAX_MESSAGE_CHARS);
    const duplicateValue = action === "poll"
      ? null
      : action === "presence"
      ? { action, sessionId }
      : clientMessageId || {
        action,
        sessionId,
        message: normalizedMessage,
        visitorName: cleanText(body.visitorName),
        visitorCompany: cleanText(body.visitorCompany),
        visitorEmail: cleanText(body.visitorEmail, 254).toLowerCase(),
      };

    let limiter;
    try {
      limiter = await authorizeDurableRateLimit({
        client: service() as unknown as RateLimitRpcClient,
        request: req,
        secret: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        endpoint: "live-chat",
        policyKey,
        clientSessionId: sessionId,
        rateLimitToken: cleanText(body.rateLimitToken, 2_000) || null,
        secondarySubjectValue: visitorToken,
        resourceValue: { action, sessionId },
        duplicateValue,
      });
    } catch (error) {
      if (error instanceof DurableRateLimitUnavailableError) {
        return json({ error: "live_chat_unavailable" }, 503, headers);
      }
      throw error;
    }

    if (!limiter.allowed) {
      return json(
        { error: "too_many_requests" },
        429,
        headers,
        { "Retry-After": String(limiter.retryAfterSeconds) },
      );
    }

    if (limiter.duplicateSuppressed) {
      if (action === "presence") {
        return json({ ok: true, presenceRecorded: true, duplicateSuppressed: true, rateLimitToken: limiter.rateLimitToken }, 200, headers);
      }
      const duplicateSession = await authenticateSession(sessionId, visitorToken);
      if (!duplicateSession.ok) {
        return json({ error: duplicateSession.reason === "not_found" ? "session_not_found" : "invalid_session_token" }, duplicateSession.reason === "not_found" ? 404 : 403, headers);
      }
      const messages = await readConversation(sessionId);
      return json({
        ok: true,
        status: duplicateSession.session.status,
        messages,
        duplicateSuppressed: true,
        rateLimitToken: limiter.rateLimitToken,
      }, 200, headers);
    }

    const geo = readGeoContext(req, body);
''',
)
replace(
    path,
    'return json({ ok: true, status: sessionStatus, presenceRecorded: true }, 200, headers);',
    'return json({ ok: true, status: sessionStatus, presenceRecorded: true, rateLimitToken: limiter.rateLimitToken }, 200, headers);',
)
replace(
    path,
    'const clientMessageId = cleanText(body.clientMessageId, 100) || null;\n        await insertVisitorMessage(sessionId, message, clientMessageId);',
    'await insertVisitorMessage(sessionId, message, clientMessageId);',
    2,
)
replace(
    path,
    'return json({ ok: true, status: "waiting", messages }, 200, headers);',
    'return json({ ok: true, status: "waiting", messages, rateLimitToken: limiter.rateLimitToken }, 200, headers);',
    2,
)
replace(
    path,
    'return json({ ok: true, status: authenticated.session.status, messages }, 200, headers);',
    'return json({ ok: true, status: authenticated.session.status, messages, rateLimitToken: limiter.rateLimitToken }, 200, headers);',
)
replace(
    path,
    'console.error("live-chat error", error);',
    'console.error("live-chat error", error instanceof Error ? error.message : "unknown_error");',
)

# Site visitor browser token continuity.
path = "src/components/SiteVisitorTracker.tsx"
replace(
    path,
    'const SESSION_KEY = "irha:site-visitor-session";\n',
    'const SESSION_KEY = "irha:site-visitor-session";\nconst RATE_TOKEN_KEY = "irha:site-visitor-rate-token";\n',
)
replace(
    path,
    '''function arrivalWasSent(sessionId: string) {
''',
    '''function readRateToken() {
  try {
    return sessionStorage.getItem(RATE_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeRateToken(value: unknown) {
  if (typeof value !== "string" || value.length > 2_000) return;
  try {
    sessionStorage.setItem(RATE_TOKEN_KEY, value);
  } catch {
    // A bootstrap identity remains available when storage is blocked.
  }
}

function arrivalWasSent(sessionId: string) {
''',
)
replace(
    path,
    '''        visitorSessionId: sessionIdRef.current,
''',
    '''        visitorSessionId: sessionIdRef.current,
        rateLimitToken: readRateToken(),
''',
)
replace(
    path,
    '''      if (!response.ok) return;
      if (action === "arrive") markArrivalSent(sessionIdRef.current);
      lastHeartbeatRef.current = Date.now();
''',
    '''      if (!response.ok) return;
      const responseBody = await response.json().catch(() => ({})) as {
        rateLimitToken?: unknown;
        dropped?: unknown;
      };
      writeRateToken(responseBody.rateLimitToken);
      if (action === "arrive" && responseBody.dropped !== "limiter_unavailable") {
        markArrivalSent(sessionIdRef.current);
      }
      lastHeartbeatRef.current = Date.now();
''',
)

# Custom Lab anonymous session, signed token, and one-entry deterministic result cache.
path = "src/pages/Studio.tsx"
replace(
    path,
    '''function classifyHub(mainCategorySlug: string): HubId | null {
''',
    '''const MOCKUP_SESSION_KEY = "irha:mockup-rate-session";
const MOCKUP_RATE_TOKEN_KEY = "irha:mockup-rate-token";
const MOCKUP_RESULT_CACHE_KEY = "irha:mockup-last-result";

function readMockupSessionId() {
  try {
    const stored = sessionStorage.getItem(MOCKUP_SESSION_KEY);
    if (stored) return stored;
    const created = `mockup-${crypto.randomUUID()}`;
    sessionStorage.setItem(MOCKUP_SESSION_KEY, created);
    return created;
  } catch {
    return `mockup-${crypto.randomUUID()}`;
  }
}

async function mockupFingerprint(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readCachedMockup(fingerprint: string) {
  try {
    const raw = sessionStorage.getItem(MOCKUP_RESULT_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as {
      fingerprint?: string;
      result?: { frontUrl: string; backUrl: string; fallback?: boolean; message?: string };
    };
    return cached.fingerprint === fingerprint && cached.result?.frontUrl && cached.result?.backUrl
      ? cached.result
      : null;
  } catch {
    return null;
  }
}

function writeCachedMockup(fingerprint: string, result: { frontUrl: string; backUrl: string; fallback?: boolean; message?: string }) {
  try {
    const serialized = JSON.stringify({ fingerprint, result });
    if (serialized.length <= 2_000_000) sessionStorage.setItem(MOCKUP_RESULT_CACHE_KEY, serialized);
  } catch {
    // Cache is optional; server-side controls remain authoritative.
  }
}

function classifyHub(mainCategorySlug: string): HubId | null {
''',
)
replace(
    path,
    '''  const fileRef = useRef<HTMLInputElement>(null);
''',
    '''  const fileRef = useRef<HTMLInputElement>(null);
  const mockupSessionIdRef = useRef(readMockupSessionId());
''',
)
replace(
    path,
    '''    try {
      const { data, error } = await supabase.functions.invoke("generate-mockup", {
        body: {
''',
    '''    try {
      const designInput = {
        productId: product.id,
        productName: product.name,
        color: { label: color.label, hex: color.hex },
        placement: placement.id,
        presetId: preset.id,
        presetLabel: preset.label,
        logoBase64: logo?.dataUrl ?? null,
      };
      const fingerprint = await mockupFingerprint(designInput);
      const cached = readCachedMockup(fingerprint);
      if (cached) {
        setResult(cached);
        return;
      }
      let rateLimitToken: string | null = null;
      try { rateLimitToken = sessionStorage.getItem(MOCKUP_RATE_TOKEN_KEY); } catch { /* bootstrap */ }
      const { data, error } = await supabase.functions.invoke("generate-mockup", {
        body: {
          ...designInput,
          clientSessionId: mockupSessionIdRef.current,
          rateLimitToken,
''',
)
replace(
    path,
    '''          productId: product.id,
          productName: product.name,
          color: { label: color.label, hex: color.hex },
          placement: placement.id,
          presetId: preset.id,
          presetLabel: preset.label,
          logoBase64: logo?.dataUrl ?? null,
        },
''',
    '''        },
''',
)
replace(
    path,
    '''      if (!data?.frontUrl || !data?.backUrl) throw new Error("Mockup generation failed");
      setResult({ frontUrl: data.frontUrl, backUrl: data.backUrl, fallback: !!data.fallback, message: data.message });
''',
    '''      if (!data?.frontUrl || !data?.backUrl) throw new Error("Mockup generation failed");
      if (typeof data.rateLimitToken === "string" && data.rateLimitToken.length <= 2_000) {
        try { sessionStorage.setItem(MOCKUP_RATE_TOKEN_KEY, data.rateLimitToken); } catch { /* optional */ }
      }
      const generated = { frontUrl: data.frontUrl, backUrl: data.backUrl, fallback: !!data.fallback, message: data.message };
      writeCachedMockup(fingerprint, generated);
      setResult(generated);
''',
)

# Live chat signed token continuity; typing endpoint remains unchanged.
path = "src/components/HumanLiveChatPro.tsx"
replace(
    path,
    '''  error?: string;
};
''',
    '''  error?: string;
  rateLimitToken?: string;
};
''',
    1,
)
replace(
    path,
    'const TOKEN_KEY = "irha:human-chat-token";\n',
    'const TOKEN_KEY = "irha:human-chat-token";\nconst RATE_TOKEN_KEY = "irha:human-chat-rate-token";\n',
)
replace(
    path,
    '''      body: JSON.stringify({ ...credentialsRef.current, ...payload }),
''',
    '''      body: JSON.stringify({
        ...credentialsRef.current,
        ...(functionName === "live-chat" ? { rateLimitToken: readStored(RATE_TOKEN_KEY) || null } : {}),
        ...payload,
      }),
''',
)
replace(
    path,
    '''    const body = await response.json().catch(() => ({ error: "invalid_response" })) as T & { error?: string };
    if (!response.ok) {
''',
    '''    const body = await response.json().catch(() => ({ error: "invalid_response" })) as T & {
      error?: string;
      rateLimitToken?: string;
    };
    if (functionName === "live-chat" && typeof body.rateLimitToken === "string" && body.rateLimitToken.length <= 2_000) {
      writeStored(RATE_TOKEN_KEY, body.rateLimitToken);
    }
    if (!response.ok) {
''',
)

print("IA-SEC-E003 deterministic integrations applied")
