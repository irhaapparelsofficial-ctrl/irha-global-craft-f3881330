import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("catalog media primary-first workflow", () => {
  it("reports pending placeholders and separates primary verification", () => {
    const backend = source("supabase/functions/catalog-media-bootstrap/index.ts");
    expect(backend).toContain("pending_catalog_assets");
    expect(backend).toContain("pending_primary_assets");
    expect(backend).toContain("verified_primary_assets");
    expect(backend).toContain('["import:published-catalog", "kind:primary"]');
  });

  it("defaults scans and imports to one primary image per product", () => {
    const backend = source("supabase/functions/catalog-media-bootstrap/index.ts");
    expect(backend).toContain('function mediaMode(value: unknown): "primary" | "all"');
    expect(backend).toContain('const mode = mediaMode(body.mode)');
    expect(backend).toContain('mode === "primary" ? candidates.filter((candidate) => candidate.position === 1) : candidates');
  });

  it("keeps social approval separate from technical import", () => {
    const backend = source("supabase/functions/catalog-media-bootstrap/index.ts");
    expect(backend).toContain("social_approved: false");
    expect(backend).toContain('action === "approve_batch"');
  });
});

describe("admin readiness truth", () => {
  it("shows primary-first controls and pending counts", () => {
    const frontend = source("src/components/admin/CatalogMediaBootstrapPanel.tsx");
    expect(frontend).toContain('useState<"primary" | "all">("primary")');
    expect(frontend).toContain("Pending catalog");
    expect(frontend).toContain("Pending primary");
    expect(frontend).toContain("Primary first");
  });

  it("does not present adapter capability as proof of a connected account", () => {
    const publishing = source("src/components/admin/SocialPublishingCenter.tsx");
    expect(publishing).toContain("External publishing is blocked.");
    expect(publishing).toContain("Adapter capability — not connection proof");
    expect(publishing).toContain('account.verification_status === "verified" && account.enabled');
  });
});
