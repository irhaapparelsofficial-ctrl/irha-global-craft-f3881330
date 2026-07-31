import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const executor = read("scripts/remediate-p001-p007-media.mjs");
const migration = read("supabase/migrations/20260731151915_align_drive_gallery_with_selected_media.sql");
const plan = read("ops/ia-media-e001/media-plan.mjs");
const localServiceRole = "select set_config('request.jwt.claim.role', 'service_role', true);";

describe("IA-MEDIA-E001 guarded SQL authorization contract", () => {
  it("establishes service-role context transaction-locally before protected mutation writes", () => {
    expect(executor.split(localServiceRole)).toHaveLength(3);

    const mutation = executor.slice(
      executor.indexOf("function buildMutationSql"),
      executor.indexOf("function buildRollbackSql"),
    );
    expect(mutation.indexOf("BEGIN;")).toBeLessThan(mutation.indexOf(localServiceRole));
    expect(mutation.indexOf(localServiceRole)).toBeLessThan(mutation.indexOf("UPDATE public.media_assets"));
    expect(mutation.indexOf("UPDATE public.media_assets")).toBeLessThan(mutation.lastIndexOf("COMMIT;"));
    expect(localServiceRole).toContain(", true)");
  });

  it("authorizes rollback inside its own transaction and keeps it reversible", () => {
    const rollback = executor.slice(
      executor.indexOf("function buildRollbackSql"),
      executor.indexOf("async function verifyDatabaseMappings"),
    );
    expect(rollback.indexOf("BEGIN;")).toBeLessThan(rollback.indexOf(localServiceRole));
    expect(rollback.indexOf(localServiceRole)).toBeLessThan(rollback.indexOf("UPDATE public.media_assets"));
    expect(rollback).toContain("rollback.products");
    expect(rollback).toContain("rollback.catalogFiles");
    expect(rollback).toContain("rollback.mediaAssets");
    expect(rollback).toContain("COMMIT;");
  });

  it("contains no persistent authorization, trigger, RLS or broad-permission bypass", () => {
    const combined = `${executor}\n${migration}`;
    expect(combined).not.toMatch(/set_config\([^\n]+,\s*false\s*\)/i);
    expect(combined).not.toMatch(/alter\s+table[\s\S]+disable\s+trigger/i);
    expect(combined).not.toMatch(/row_security\s*=\s*off/i);
    expect(combined).not.toMatch(/grant\s+all/i);
    expect(combined).not.toMatch(/grant\s+.+\s+to\s+(public|anon|authenticated)/i);
    expect(migration).toContain("t.tgenabled='O'");
    expect(migration).toContain("media_assets_before_write_trigger");
    expect(migration).toContain("trg_sync_drive_product_gallery_from_media");
    expect(migration).toContain("a_enforce_drive_product_front_first");
  });

  it("aligns gallery refresh with selected media while preserving canonical hero verification", () => {
    expect(migration).toContain("and d.published_in_gallery");
    expect(migration).toContain("where d.role='hero'");
    expect(migration).toContain("m.verification_status='verified'");
    expect(migration).toContain("m.mime_type='image/webp'");
    expect(migration).toContain("m.checksum_sha256 ~ '^[A-Fa-f0-9]{64}$'");
    expect(migration).not.toContain("d.web_object_path ~ '^catalog/products/.+-front");
    expect(migration).toContain("grant execute on function public.refresh_drive_product_gallery(uuid) to service_role");
    expect(migration).toContain("revoke all on function public.enforce_drive_product_front_first() from public,anon,authenticated");
  });

  it("keeps product/media scope exactly P001-P007 and rejects the P003 duplicate", () => {
    for (let product = 1; product <= 7; product += 1) {
      expect(plan).toContain(`IRHA-P${String(product).padStart(3, "0")}`);
    }
    expect(plan).not.toMatch(/IRHA-P(?:00[89]|0[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])/);
    expect(plan).toContain("1N2HfKQMsBuAQSUMjJXuKVLjPlfUAdSG3");
    expect(plan).toContain("Checksum-identical duplicate");
    expect(executor).toContain("REJECTED_DUPLICATE_ID");
    expect(executor).toContain("published_in_gallery = false");
    expect(executor).toContain("visual_review_status = 'rejected'");
  });
});
