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
  it("enriches the existing durable outbox server-side with intent-specific mobile-first alerts", () => {
    const helper = read("supabase/functions/notification-dispatcher/owner-email.ts");
    const dispatcher = read("supabase/functions/notification-dispatcher/index.ts");
    expect(helper).toContain("New Website RFQ — ");
    expect(helper).toContain("Sample Request — ");
    expect(helper).toContain("Factory Video Call Request — ");
    expect(helper).toContain("Catalogue Request — ");
    expect(helper).toContain("Live Chat Opened — ");
    expect(helper).toContain("Live Chat Message — ");
    expect(helper).toContain("Buyer: ");
    expect(helper).toContain("Company: ");
    expect(helper).toContain("Country: ");
    expect(helper).toContain("WhatsApp: ");
    expect(helper).toContain("Email: ");
    expect(helper).toContain("Source page: ");
    expect(dispatcher).toContain("await enrichOwnerEmailPayload(service, row)");
    expect(dispatcher).toContain('"idempotency-key": row.id');
    expect(dispatcher).toContain("notification_kind");
  });

  it("does not create a second notification architecture or weaken database controls", () => {
    const helper = read("supabase/functions/notification-dispatcher/owner-email.ts");
    expect(helper).toContain('.from("crm_notifications")');
    expect(helper).toContain('.from("inquiries")');
    expect(helper).toContain('.from("catalogue_leads")');
    expect(helper).toContain('.from("chat_sessions")');
    expect(helper).toContain('.from("chat_messages")');
    expect(helper).not.toContain("service_role");
    expect(helper).not.toContain("insert(");
  });
});
