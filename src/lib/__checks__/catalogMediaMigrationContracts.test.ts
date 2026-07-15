import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const rebuild = readFileSync(
  resolve(root, "supabase/migrations/20260715223040_rebuild_product_media_and_b2b_details_20260716.sql"),
  "utf8",
);
const expansion = readFileSync(
  resolve(root, "supabase/migrations/20260715223808_expand_catalog_with_exclusive_reference_styles_service_context_20260716.sql"),
  "utf8",
);

describe("catalog media production migration contracts", () => {
  it("backs up and validates the 64-product media rebuild", () => {
    expect(rebuild).toContain("private.catalog_product_backup_20260716");
    expect(rebuild).toContain("published_count <> 64");
    expect(rebuild).toContain("gallery[1] IS DISTINCT FROM image_url");
    expect(rebuild).toContain("count(DISTINCT id) > 1");
    expect(rebuild).toContain("cardinality(gallery) BETWEEN 3 AND 6");
  });

  it("creates exactly 22 exclusive styles and validates the 86-product release", () => {
    expect(expansion).toContain("plan_count <> 22");
    expect(expansion).toContain("published_count <> 86");
    expect(expansion).toContain("Reference Style");
    expect(expansion).toContain("count(DISTINCT id) > 1");
    expect(expansion).toContain("asset_count <> 6 OR primary_count <> 1");
    expect(expansion).toContain("private.catalog_public_release_cache");
    expect(expansion).toContain("private.build_catalog_public_release()");
  });

  it("keeps the media security trigger enabled and uses only a local service claim", () => {
    expect(expansion).toContain("set_config('request.jwt.claim.role', 'service_role', true)");
    expect(expansion).toContain("set_config('request.jwt.claim.role', '', true)");
    expect(expansion).toContain("media_assets_before_write_trigger");
    expect(expansion).not.toContain("DISABLE TRIGGER");
  });

  it("does not introduce fixed pricing, MOQ, certification or delivery promises", () => {
    const combined = `${rebuild}\n${expansion}`;
    expect(combined).not.toMatch(/[$€£]\s*\d/);
    expect(combined).not.toMatch(/MOQ\s*(?:is|of|:)\s*\d/i);
    expect(combined).not.toMatch(/delivery\s+(?:in|within)\s+\d/i);
    expect(combined).not.toMatch(/(?:ISO|GOTS|OEKO|CE)\s*certified/i);
  });
});
