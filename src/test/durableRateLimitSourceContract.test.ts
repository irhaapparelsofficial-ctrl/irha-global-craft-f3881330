import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const sources = {
  mockup: read("supabase/functions/generate-mockup/index.ts"),
  visitor: read("supabase/functions/site-visitor/index.ts"),
  chat: read("supabase/functions/live-chat/index.ts"),
};

function handler(source: string) {
  const start = source.indexOf("Deno.serve");
  expect(start).toBeGreaterThanOrEqual(0);
  return source.slice(start);
}

function expectDurableOnly(source: string) {
  expect(source).toContain("authorizeDurableRateLimit");
  expect(source).not.toMatch(/new\s+Map\s*</);
  expect(source).not.toContain("x-forwarded-for");
  expect(source).not.toContain("x-real-ip");
  expect(source).not.toContain("cf-connecting-ip");
}

describe("IA-SEC-E003 source contracts", () => {
  it("removes isolate-memory and forwarding-header identity from all protected functions", () => {
    Object.values(sources).forEach(expectDurableOnly);
  });

  it("authorizes mockup generation before PNG work", () => {
    const body = handler(sources.mockup);
    expect(body.indexOf("authorizeDurableRateLimit")).toBeGreaterThanOrEqual(0);
    expect(body.indexOf("authorizeDurableRateLimit")).toBeLessThan(body.indexOf("encodePng("));
    expect(body).toContain('error: "rate_limit_unavailable"');
    expect(body).toContain('error: "preview_rate_limited"');
    expect(body).toContain('"Retry-After"');
  });

  it("authorizes visitor analytics before database and notification writes", () => {
    const body = handler(sources.visitor);
    const limiter = body.indexOf("authorizeDurableRateLimit");
    expect(limiter).toBeGreaterThanOrEqual(0);
    expect(limiter).toBeLessThan(body.indexOf('.from("site_visitors")'));
    expect(limiter).toBeLessThan(body.indexOf('.from("crm_notifications")'));
    expect(body).toContain('return json({ ok: true, dropped: "limiter_unavailable" }, 200, origin);');
    expect(body).toContain('return json({ ok: true, dropped: "duplicate", rateLimitToken: limiter.rateLimitToken }, 200, origin);');
  });

  it("authorizes every live-chat action before session, message, or owner-notification work", () => {
    const body = handler(sources.chat);
    const limiter = body.indexOf("authorizeDurableRateLimit");
    expect(limiter).toBeGreaterThanOrEqual(0);
    expect(limiter).toBeLessThan(body.indexOf("authenticateSession("));
    expect(limiter).toBeLessThan(body.indexOf('.from("chat_sessions")'));
    expect(limiter).toBeLessThan(body.indexOf("insertVisitorMessage("));
    expect(limiter).toBeLessThan(body.indexOf("alertOwnerOfPresence("));
    expect(body).toContain('error: "live_chat_unavailable"');
    expect(body).toContain('error: "too_many_requests"');
    expect(body).toContain('"Retry-After"');
  });

  it("keeps site analytics fail-open only by dropping the write", () => {
    const body = handler(sources.visitor);
    const outage = body.indexOf('dropped: "limiter_unavailable"');
    const firstWrite = body.indexOf('.from("site_visitors")');
    expect(outage).toBeGreaterThanOrEqual(0);
    expect(outage).toBeLessThan(firstWrite);
  });
});
