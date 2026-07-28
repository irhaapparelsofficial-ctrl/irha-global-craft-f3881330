import { describe, expect, it, vi } from "vitest";
import {
  authorizeDurableRateLimit,
  clampRetryAfter,
  hashRateLimitValue,
  isRejectedIdentityHeader,
  isValidClientSessionId,
  issueAnonymousRateLimitToken,
  normalizeRateLimitValue,
  policyForLiveChatAction,
  policyForSiteVisitorAction,
  resolveValidatedUserId,
  trustedIdentityHeaders,
  validateAnonymousRateLimitToken,
  type RateLimitRpcClient,
} from "../../supabase/functions/_shared/durable-rate-limit";

const SECRET = "test-service-role-secret-that-is-long-enough-for-hmac";
const SESSION = "human-11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-07-28T12:00:00.000Z");

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function unsignedJwt(role: string) {
  return `${base64Url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${base64Url(JSON.stringify({ role }))}.signature`;
}

function allowClient(capture?: (args: Record<string, unknown>) => void): RateLimitRpcClient {
  return {
    rpc: vi.fn(async (_functionName, args) => {
      capture?.(args);
      return {
        data: [{
          decision: "ALLOW",
          retry_after_seconds: 0,
          remaining: 5,
          duplicate_suppressed: false,
          blocked_until: null,
        }],
        error: null,
      };
    }),
  };
}

describe("durable rate-limit identity", () => {
  it("issues endpoint- and session-bound anonymous tokens", async () => {
    const token = await issueAnonymousRateLimitToken(SECRET, "live-chat", SESSION, NOW, 600);
    await expect(validateAnonymousRateLimitToken(SECRET, token, "live-chat", SESSION, NOW)).resolves.toBe(true);
    await expect(validateAnonymousRateLimitToken(SECRET, token, "site-visitor", SESSION, NOW)).resolves.toBe(false);
    await expect(validateAnonymousRateLimitToken(SECRET, token, "live-chat", `${SESSION}-other`, NOW)).resolves.toBe(false);
    await expect(validateAnonymousRateLimitToken(SECRET, `${token}tampered`, "live-chat", SESSION, NOW)).resolves.toBe(false);
    await expect(validateAnonymousRateLimitToken(SECRET, token, "live-chat", SESSION, new Date("2026-07-28T12:11:00.000Z"))).resolves.toBe(false);
  });

  it("creates stable HMAC keys with domain separation", async () => {
    const first = await hashRateLimitValue(SECRET, "subject:live-chat", { b: 2, a: 1 });
    const reordered = await hashRateLimitValue(SECRET, "subject:live-chat", { a: 1, b: 2 });
    const otherDomain = await hashRateLimitValue(SECRET, "resource:live-chat", { a: 1, b: 2 });
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).toBe(reordered);
    expect(first).not.toBe(otherDomain);
  });

  it("never treats forwarding headers as trusted identity", () => {
    const request = new Request("https://example.test", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "x-real-ip": "203.0.113.11",
        "cf-connecting-ip": "203.0.113.12",
      },
    });
    expect(trustedIdentityHeaders(request)).toEqual([]);
    expect(isRejectedIdentityHeader("X-Forwarded-For")).toBe(true);
    expect(isRejectedIdentityHeader("x-real-ip")).toBe(true);
    expect(isRejectedIdentityHeader("cf-connecting-ip")).toBe(true);
  });

  it("uses validated authenticated identity but rejects a publishable bearer", async () => {
    const authenticatedResolver = vi.fn(async () => "user-123");
    const authenticatedRequest = new Request("https://example.test", {
      headers: { authorization: `Bearer ${unsignedJwt("authenticated")}` },
    });
    await expect(resolveValidatedUserId(authenticatedRequest, allowClient(), authenticatedResolver)).resolves.toBe("user-123");
    expect(authenticatedResolver).toHaveBeenCalledOnce();

    const publishableResolver = vi.fn(async () => "must-not-be-used");
    const publishableRequest = new Request("https://example.test", {
      headers: { authorization: `Bearer ${unsignedJwt("anon")}` },
    });
    await expect(resolveValidatedUserId(publishableRequest, allowClient(), publishableResolver)).resolves.toBeNull();
    expect(publishableResolver).not.toHaveBeenCalled();
  });

  it("produces the same RPC subject when spoofed forwarding headers change", async () => {
    const captured: Record<string, unknown>[] = [];
    const client = allowClient((args) => captured.push(args));
    const common = {
      client,
      secret: SECRET,
      endpoint: "live-chat" as const,
      policyKey: "live-chat.poll",
      clientSessionId: SESSION,
      now: NOW,
      secondarySubjectValue: "visitor-token-that-is-at-least-thirty-two-characters",
    };
    await authorizeDurableRateLimit({
      ...common,
      request: new Request("https://example.test", { headers: { "x-forwarded-for": "203.0.113.1" } }),
    });
    await authorizeDurableRateLimit({
      ...common,
      request: new Request("https://example.test", { headers: { "x-forwarded-for": "198.51.100.2" } }),
    });
    expect(captured).toHaveLength(2);
    expect(captured[0].p_subject_hash).toBe(captured[1].p_subject_hash);
  });
});

describe("durable rate-limit policy helpers", () => {
  it("maps only approved endpoint actions", () => {
    expect(policyForSiteVisitorAction("arrive")).toBe("site-visitor.arrive");
    expect(policyForSiteVisitorAction("heartbeat")).toBe("site-visitor.heartbeat");
    expect(policyForSiteVisitorAction("delete")).toBeNull();
    expect(policyForLiveChatAction("send")).toBe("live-chat.send");
    expect(policyForLiveChatAction("poll")).toBe("live-chat.poll");
    expect(policyForLiveChatAction("admin")).toBeNull();
  });

  it("bounds retry-after and rejects malformed sessions", () => {
    expect(clampRetryAfter(-1)).toBe(1);
    expect(clampRetryAfter(12.1)).toBe(13);
    expect(clampRetryAfter(99_999)).toBe(3600);
    expect(isValidClientSessionId(SESSION)).toBe(true);
    expect(isValidClientSessionId("short")).toBe(false);
    expect(isValidClientSessionId("x".repeat(201))).toBe(false);
  });

  it("normalizes duplicate fingerprints deterministically and bounds inputs", () => {
    expect(normalizeRateLimitValue({ z: "  repeated   message ", a: [2, 1] }))
      .toBe(normalizeRateLimitValue({ a: [2, 1], z: "repeated message" }));
    const oversized = normalizeRateLimitValue("x".repeat(20_000));
    expect(oversized.length).toBeLessThanOrEqual(10_002);
  });
});
