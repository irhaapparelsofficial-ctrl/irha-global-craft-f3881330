import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260717223000_gate_public_product_claims_by_quality_review.sql";
const migrationBuffer = readFileSync(resolve(root, migrationPath));
const migration = migrationBuffer.toString("utf8");
const manifest = JSON.parse(
  readFileSync(resolve(root, "supabase/repository-migrations.json"), "utf8"),
) as {
  project_id: string;
  ledger_table: string;
  migrations: Array<{
    version: string;
    name: string;
    path: string;
    git_blob_sha: string;
    transactional_dry_run: boolean;
  }>;
};

function gitBlobSha(buffer: Buffer) {
  const prefix = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(prefix).update(buffer).digest("hex");
}

describe("public catalogue verified-claims gate", () => {
  it("registers the exact migration blob in the owner-project manifest", () => {
    const entry = manifest.migrations.find((item) => item.version === "20260717223000");
    expect(manifest.project_id).toBe("pvzjiozismyxqrzmtfbi");
    expect(manifest.ledger_table).toBe("private.irha_repository_migration_ledger");
    expect(entry).toEqual({
      version: "20260717223000",
      name: "gate_public_product_claims_by_quality_review",
      path: migrationPath,
      git_blob_sha: gitBlobSha(migrationBuffer),
      transactional_dry_run: true,
    });
  });

  it("joins the admin quality workflow and exposes an explicit verification state", () => {
    expect(migration).toContain("left join public.product_quality_reviews q on q.product_id = p.id");
    expect(migration).toContain("'claim_verification_status', coalesce(q.status, 'pending')");
    expect(migration).toContain("'claims_verified_at', case when q.status = 'verified'");
  });

  it("withholds exact commercial, material, sizing and packaging fields until verified", () => {
    for (const field of [
      "material_specifications",
      "sample_available",
      "country_of_origin",
      "primary_material",
      "fabric_composition",
      "gsm",
      "size_notes",
      "custom_colors",
      "packaging_standard",
      "packaging_custom",
    ]) {
      expect(migration).toContain(`'${field}', case when q.status = 'verified'`);
    }
    expect(migration).toContain("'available_sizes', to_jsonb(case when q.status = 'verified'");
    expect(migration).toContain("'available_colors', to_jsonb(case when q.status = 'verified'");
    expect(migration).toContain("'customization', case when q.status = 'verified'");
  });

  it("keeps unverified products discoverable with requirement-led B2B copy", () => {
    expect(migration).toContain("wholesale, OEM, ODM and private-label development");
    expect(migration).toContain("confirmed after buyer and factory review");
    expect(migration).toContain("Specifications are confirmed after requirement review");
    expect(migration).not.toContain("MOQ 50");
    expect(migration).not.toContain("45-day");
    expect(migration).not.toMatch(/OEKO|BSCI|SEDEX|ISO 9001|GOTS|WRAP|REACH/i);
  });

  it("preserves the public read contract without granting write access", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public, pg_temp");
    expect(migration).toContain("revoke all on function public.catalog_get_public_release() from public");
    expect(migration).toContain("grant execute on function public.catalog_get_public_release() to anon, authenticated");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete|all)\b/i);
  });
});
