import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260717232000_seed_draft_b2b_seo_foundation.sql";
const migrationBuffer = readFileSync(resolve(root, migrationPath));
const migration = migrationBuffer.toString("utf8");
const claimSurface = migration.replace(
  /'\["retail price","single piece","costume rental","free sample","guaranteed delivery","certified supplier"\]'::jsonb/g,
  "'[]'::jsonb",
);
const manifest = JSON.parse(
  readFileSync(resolve(root, "supabase/repository-migrations.json"), "utf8"),
) as {
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

function extract(pattern: RegExp, label: string) {
  const match = migration.match(pattern);
  if (!match?.[1]) throw new Error(`Unable to extract ${label}`);
  return match[1];
}

describe("draft B2B SEO foundation", () => {
  it("registers the exact migration blob after the taxonomy foundation", () => {
    const entry = manifest.migrations.find((item) => item.version === "20260717232000");
    expect(entry).toEqual({
      version: "20260717232000",
      name: "seed_draft_b2b_seo_foundation",
      path: migrationPath,
      git_blob_sha: gitBlobSha(migrationBuffer),
      transactional_dry_run: true,
    });
    const versions = manifest.migrations.map((item) => item.version);
    expect(versions.indexOf("20260717232000")).toBeGreaterThan(versions.indexOf("20260717230500"));
  });

  it("repairs existing localized drafts without approving or indexing them", () => {
    expect(migration).toContain("base_route = '/products/bavarian-trachten-wear'");
    expect(migration).toContain("replace(p.json_ld->>'url', 'https://www.irhaapparels.com', 'https://irhaapparels.com')");
    expect(migration).toContain("when '/bavarian-heritage' then '/products/bavarian-trachten-wear'");
    expect(migration).toContain("when '/request-quote' then '/inquiry?intent=rfq'");
    expect(migration).toContain("status = 'draft'");
    expect(migration).toContain("noindex = true");
    expect(migration).toContain("native_review_status = 'required'");
    expect(migration).toContain("approved_at = null");
    expect(migration).toContain("published_at = null");
  });

  it("seeds ten distinct English commercial-intent clusters without search-volume claims", () => {
    const block = extract(
      /with clusters\([\s\S]*?\) as \(\s*values([\s\S]*?)\n\)\ninsert into public\.seo_keyword_clusters/,
      "keyword clusters",
    );
    const keys = Array.from(block.matchAll(/\(\s*'([a-z0-9-]+)',\s*\n\s*'/g)).map((match) => match[1]);
    expect(keys).toHaveLength(10);
    expect(new Set(keys).size).toBe(10);
    expect(keys).toEqual(expect.arrayContaining([
      "lederhosen-manufacturer",
      "dirndl-private-label",
      "leather-jacket-manufacturer",
      "football-kit-manufacturer",
      "heavyweight-hoodie-manufacturer",
      "nightwear-pajama-manufacturer",
    ]));
    expect(migration).toContain("'search_volume_claims', false");
    expect(migration).toContain("'commercial_claim_review_required', true");
    expect(migration).toContain("'draft'");
  });

  it("prepares six future route overrides as unpublished and noindex", () => {
    const block = extract(
      /with overrides\(route, seo_title, seo_description\) as \(\s*values([\s\S]*?)\n\)\ninsert into public\.seo_page_overrides/,
      "SEO overrides",
    );
    const routes = Array.from(block.matchAll(/\('([^']+)',/g)).map((match) => match[1]);
    expect(routes).toHaveLength(6);
    expect(new Set(routes).size).toBe(6);
    expect(routes.every((route) => route.startsWith("/products/"))).toBe(true);
    expect(migration).toContain("'https://irhaapparels.com' || o.route");
    expect(migration).toContain("noindex, is_published, notes");
    expect(migration).toContain("true,\n  false,\n  'Draft only.");
  });

  it("prepares twelve internal-link plans but does not publish them", () => {
    const block = extract(
      /with links\(from_route, to_route, anchor_text, priority\) as \(\s*values([\s\S]*?)\n\)\ninsert into public\.internal_links/,
      "internal links",
    );
    const rows = Array.from(block.matchAll(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\d+\)/g));
    expect(rows).toHaveLength(12);
    expect(migration).toContain("l.priority,\n  false");
    expect(migration).toContain("is_published = false");
  });

  it("creates five complete buyer-guide drafts without publishing them", () => {
    const block = extract(
      /with drafts\(slug, title, excerpt, body_md, tags, sort_order\) as \(\s*values([\s\S]*?)\n\)\ninsert into public\.blog_posts/,
      "blog drafts",
    );
    const slugs = Array.from(block.matchAll(/\(\s*'([a-z0-9-]+)',\s*\n\s*'/g)).map((match) => match[1]);
    expect(slugs).toHaveLength(5);
    expect(new Set(slugs).size).toBe(5);
    for (const section of [
      "# How to Source Private-label Lederhosen",
      "# Custom Football Kit Manufacturer Checklist",
      "# Private-label Leather Jacket Development",
      "# Heavyweight Hoodie Manufacturer RFQ Guide",
      "# Private-label Nightwear Specification Checklist",
    ]) {
      expect(block).toContain(section);
    }
    expect(migration).toContain("published_at, is_published, sort_order");
    expect(migration).toContain("null,\n  false,");
  });

  it("does not invent named certifications, capacities, prices or fixed delivery promises", () => {
    expect(claimSurface).not.toMatch(/\b(?:OEKO-TEX|BSCI|SEDEX|ISO 9001|GOTS|WRAP|REACH)\b/i);
    expect(claimSurface).not.toMatch(/\b\d+\s*(?:pieces|pcs|units)\s*(?:per|\/)?\s*(?:day|month)\b/i);
    expect(claimSurface).not.toMatch(/\b(?:USD|EUR|GBP|PKR)\s*\d+/i);
    expect(claimSurface).not.toMatch(/\b(?:guaranteed|fixed)\s+(?:delivery|lead time|MOQ)\b/i);
    expect(migration).toContain("Quantity, sample cost, production timing and delivery terms should be quoted only after the requirements are reviewed");
  });

  it("fails closed if any prepared SEO asset becomes public", () => {
    expect(migration).toContain("this foundation may prepare content, never publish it");
    expect(migration).toContain("expected 10 draft English B2B keyword clusters");
    expect(migration).toContain("expected at least 6 unpublished noindex route overrides");
    expect(migration).toContain("expected at least 12 unpublished internal-link plans");
    expect(migration).toContain("expected at least 5 unpublished buyer-guide drafts");
    expect(migration).toContain("draft SEO overrides must not be published");
    expect(migration).toContain("planned internal links must not be published");
    expect(migration).toContain("buyer-guide drafts must not be published");
  });
});
