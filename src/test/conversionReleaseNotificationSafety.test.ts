import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("production release-boundary safety", () => {
  it("retires legacy client caches before route preloads and recovers Vite preload failures once", () => {
    const main = read("src/main.tsx");
    expect(main).toContain('const CACHE_HEAL_VERSION = "2026-08-07-v4"');
    expect(main).toContain('window.addEventListener("vite:preloadError"');
    expect(main).toContain("claimOneTimeAssetRecovery(route)");
    expect(main).toContain("await healLegacyClientCacheOnce();");
    expect(main.indexOf("await healLegacyClientCacheOnce();")).toBeLessThan(
      main.indexOf("preloadInitialRoute(normalizedPathname())"),
    );
    expect(main).toContain('new URL(scriptUrl).pathname === OWNER_PUSH_WORKER_PATH');
  });

  it("seals extensionless HTML with browser and CDN no-store without changing hashed assets", () => {
    const seal = read("scripts/seal-authoritative-worker.ts");
    expect(seal).toContain("function withHtmlFreshnessHeaders(response)");
    expect(seal).toContain('contentType.includes("text/html")');
    expect(seal).toContain('headers.set("CDN-Cache-Control", "no-store")');
    expect(seal).toContain('headers.set("X-Irha-Html-Freshness", "worker-no-store")');
    expect(seal).toContain("return withHtmlFreshnessHeaders(assetResponse);");
  });
});

describe("owner conversion email quality", () => {
  it("uses the existing durable CRM/outbox path with intent-specific mobile-first alerts", () => {
    const migration = read("supabase/migrations/20260807090000_conversion_owner_email_quality.sql");
    expect(migration).toContain("New Website RFQ — ");
    expect(migration).toContain("Sample Request — ");
    expect(migration).toContain("Factory Video Call Request — ");
    expect(migration).toContain("Catalogue Request — ");
    expect(migration).toContain("Live Chat Opened — ");
    expect(migration).toContain("Live Chat Message — ");
    expect(migration).toContain("Buyer: ");
    expect(migration).toContain("Company: ");
    expect(migration).toContain("Country: ");
    expect(migration).toContain("WhatsApp: ");
    expect(migration).toContain("Email: ");
    expect(migration).toContain("Source page: ");
    expect(migration).toContain("on conflict(dedupe_key) do nothing");
  });

  it("keeps admin chat replies out of new visitor-message notifications", () => {
    const migration = read("supabase/migrations/20260807090000_conversion_owner_email_quality.sql");
    expect(migration).toContain("if new.role = 'user' then");
    expect(migration).toContain("elsif new.role = 'admin' then");
    expect(migration).toContain("and status = 'unread'");
  });
});
