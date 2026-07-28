export type RateLimitDecision = "ALLOW" | "THROTTLE" | "TEMPORARY_BLOCK";

export type RateLimitResult = {
  allowed: boolean;
  decision: RateLimitDecision;
  retryAfterSeconds: number;
  remaining: number;
  duplicateSuppressed: boolean;
  blockedUntil: string | null;
  rateLimitToken: string;
  subjectKind: "authenticated" | "anonymous" | "bootstrap";
};

export type RateLimitRpcClient = {
  rpc: (
    functionName: "consume_edge_rate_limit",
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  auth?: {
    getUser: (accessToken: string) => Promise<{
      data: { user?: { id?: string } | null } | null;
      error: unknown;
    }>;
  };
};

export type AuthorizeRateLimitInput = {
  client: RateLimitRpcClient;
  request: Request;
  secret: string;
  endpoint: "generate-mockup" | "site-visitor" | "live-chat";
  policyKey: string;
  clientSessionId: string;
  rateLimitToken?: string | null;
  resourceValue?: unknown;
  duplicateValue?: unknown;
  secondarySubjectValue?: string | null;
  now?: Date;
  tokenTtlSeconds?: number;
  resolveUserId?: (accessToken: string) => Promise<string | null>;
};

export class DurableRateLimitUnavailableError extends Error {
  constructor() {
    super("durable_rate_limit_unavailable");
    this.name = "DurableRateLimitUnavailableError";
  }
}

const encoder = new TextEncoder();
const ALLOWED_POLICIES = new Set([
  "generate-mockup.generate",
  "site-visitor.arrive",
  "site-visitor.heartbeat",
  "site-visitor.chat_open",
  "live-chat.presence",
  "live-chat.connect",
  "live-chat.send",
  "live-chat.poll",
]);

const REJECTED_IDENTITY_HEADERS = new Set([
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "x-client-ip",
  "x-user-id",
  "x-account-id",
  "x-session-id",
]);

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function hmacBytes(secret: string, domain: string, value: string) {
  if (!secret || secret.length < 32) throw new DurableRateLimitUnavailableError();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`irha-rate-limit-v1\n${domain}\n${value}`));
  return new Uint8Array(signature);
}

export async function hashRateLimitValue(secret: string, domain: string, value: unknown) {
  return bytesToHex(await hmacBytes(secret, domain, normalizeRateLimitValue(value)));
}

export function normalizeRateLimitValue(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (input === null || input === undefined) return null;
    if (typeof input === "string") return input.trim().replace(/\s+/g, " ").slice(0, 10_000);
    if (typeof input === "number") return Number.isFinite(input) ? input : null;
    if (typeof input === "boolean") return input;
    if (Array.isArray(input)) return input.slice(0, 100).map(normalize);
    if (typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .slice(0, 100)
          .map(([key, child]) => [key.slice(0, 100), normalize(child)]),
      );
    }
    return String(input).slice(0, 1_000);
  };
  return JSON.stringify(normalize(value));
}

export function isValidClientSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9:_-]{16,200}$/.test(value);
}

export function isRejectedIdentityHeader(headerName: string) {
  return REJECTED_IDENTITY_HEADERS.has(headerName.trim().toLowerCase());
}

export function trustedIdentityHeaders(_request: Request): string[] {
  // No network forwarding header is authoritative in the Supabase Edge runtime.
  return [];
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

export async function resolveValidatedUserId(
  request: Request,
  client: RateLimitRpcClient,
  resolver?: (accessToken: string) => Promise<string | null>,
) {
  const token = bearerToken(request);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (payload?.role !== "authenticated") return null;
  if (resolver) return resolver(token);
  if (!client.auth) return null;
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

type AnonymousTokenPayload = {
  v: 1;
  endpoint: string;
  session: string;
  exp: number;
};

async function sessionBinding(secret: string, endpoint: string, clientSessionId: string) {
  return hashRateLimitValue(secret, `session-binding:${endpoint}`, clientSessionId);
}

export async function issueAnonymousRateLimitToken(
  secret: string,
  endpoint: string,
  clientSessionId: string,
  now = new Date(),
  ttlSeconds = 86_400,
) {
  if (!isValidClientSessionId(clientSessionId)) throw new Error("invalid_client_session_id");
  const payload: AnonymousTokenPayload = {
    v: 1,
    endpoint,
    session: await sessionBinding(secret, endpoint, clientSessionId),
    exp: Math.floor(now.getTime() / 1000) + Math.max(300, Math.min(604_800, ttlSeconds)),
  };
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacBytes(secret, "anonymous-token", encodedPayload);
  return `v1.${encodedPayload}.${bytesToBase64Url(signature)}`;
}

export async function validateAnonymousRateLimitToken(
  secret: string,
  token: string | null | undefined,
  endpoint: string,
  clientSessionId: string,
  now = new Date(),
) {
  if (!token || !isValidClientSessionId(clientSessionId)) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  try {
    const expectedSignature = await hmacBytes(secret, "anonymous-token", parts[1]);
    if (!constantTimeEqual(expectedSignature, base64UrlToBytes(parts[2]))) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as AnonymousTokenPayload;
    if (payload.v !== 1 || payload.endpoint !== endpoint) return false;
    if (!Number.isInteger(payload.exp) || payload.exp <= Math.floor(now.getTime() / 1000)) return false;
    const expectedBinding = await sessionBinding(secret, endpoint, clientSessionId);
    return payload.session === expectedBinding;
  } catch {
    return false;
  }
}

export function clampRetryAfter(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.min(3600, Math.ceil(numeric)));
}

function normalizeRpcRow(data: unknown) {
  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate || typeof candidate !== "object") throw new DurableRateLimitUnavailableError();
  const row = candidate as Record<string, unknown>;
  const decision = row.decision;
  if (decision !== "ALLOW" && decision !== "THROTTLE" && decision !== "TEMPORARY_BLOCK") {
    throw new DurableRateLimitUnavailableError();
  }
  return {
    decision,
    retryAfterSeconds: decision === "ALLOW" ? 0 : clampRetryAfter(row.retry_after_seconds),
    remaining: Math.max(0, Math.min(10_000_000, Number(row.remaining) || 0)),
    duplicateSuppressed: Boolean(row.duplicate_suppressed),
    blockedUntil: typeof row.blocked_until === "string" ? row.blocked_until : null,
  } satisfies Omit<RateLimitResult, "allowed" | "rateLimitToken" | "subjectKind">;
}

export function policyForSiteVisitorAction(action: string) {
  if (action === "arrive" || action === "heartbeat" || action === "chat_open") return `site-visitor.${action}`;
  return null;
}

export function policyForLiveChatAction(action: string) {
  if (action === "presence" || action === "connect" || action === "send" || action === "poll") return `live-chat.${action}`;
  return null;
}

export async function authorizeDurableRateLimit(input: AuthorizeRateLimitInput): Promise<RateLimitResult> {
  if (!ALLOWED_POLICIES.has(input.policyKey)) throw new Error("invalid_rate_limit_policy");
  if (!isValidClientSessionId(input.clientSessionId)) throw new Error("invalid_client_session_id");
  const now = input.now ?? new Date();
  const userId = await resolveValidatedUserId(input.request, input.client, input.resolveUserId);
  const anonymousTokenValid = userId
    ? false
    : await validateAnonymousRateLimitToken(
      input.secret,
      input.rateLimitToken,
      input.endpoint,
      input.clientSessionId,
      now,
    );

  let subjectKind: RateLimitResult["subjectKind"];
  let subjectMaterial: string;
  if (userId) {
    subjectKind = "authenticated";
    subjectMaterial = `user:${userId}`;
  } else if (anonymousTokenValid) {
    subjectKind = "anonymous";
    subjectMaterial = `session:${input.clientSessionId}`;
  } else {
    subjectKind = "bootstrap";
    // The first request and the subsequently signed anonymous session consume
    // the same subject bucket, so token issuance cannot reset allowance.
    subjectMaterial = `session:${input.clientSessionId}`;
  }
  if (input.secondarySubjectValue) subjectMaterial += `:${input.secondarySubjectValue}`;

  const [subjectHash, resourceHash, duplicateHash, refreshedToken] = await Promise.all([
    hashRateLimitValue(input.secret, `subject:${input.endpoint}`, subjectMaterial),
    hashRateLimitValue(input.secret, `resource:${input.policyKey}`, input.resourceValue ?? input.clientSessionId),
    input.duplicateValue === undefined || input.duplicateValue === null
      ? Promise.resolve(null)
      : hashRateLimitValue(input.secret, `duplicate:${input.policyKey}`, input.duplicateValue),
    issueAnonymousRateLimitToken(
      input.secret,
      input.endpoint,
      input.clientSessionId,
      now,
      input.tokenTtlSeconds,
    ),
  ]);

  let response: Awaited<ReturnType<RateLimitRpcClient["rpc"]>>;
  try {
    response = await input.client.rpc("consume_edge_rate_limit", {
      p_policy_key: input.policyKey,
      p_subject_hash: subjectHash,
      p_resource_hash: resourceHash,
      p_duplicate_hash: duplicateHash,
      p_cost: 1,
      p_now: now.toISOString(),
    });
  } catch {
    throw new DurableRateLimitUnavailableError();
  }
  if (response.error) throw new DurableRateLimitUnavailableError();
  const result = normalizeRpcRow(response.data);
  return {
    ...result,
    allowed: result.decision === "ALLOW",
    rateLimitToken: refreshedToken,
    subjectKind,
  };
}

export function rateLimitResponseHeaders(retryAfterSeconds: number, extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  headers.set("Retry-After", String(clampRetryAfter(retryAfterSeconds)));
  headers.set("Cache-Control", "no-store");
  return headers;
}
