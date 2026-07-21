import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "scripts/augment-sitemap-with-live-catalog.ts"), "utf8");

describe("live catalogue sitemap pagination", () => {
  it("uses explicit stable limit/offset pagination for the table-valued RPC", () => {
    expect(source).toContain('endpoint.searchParams.set("order", "entry_kind.asc,path.asc")');
    expect(source).toContain('endpoint.searchParams.set("limit", String(PAGE_SIZE))');
    expect(source).toContain('endpoint.searchParams.set("offset", String(offset))');
    expect(source).toContain("offset += page.length");
    expect(source).not.toContain('Range: `${offset}-${offset + PAGE_SIZE - 1}`');
  });

  it("fails closed when pagination repeats or exceeds a safe bound", () => {
    expect(source).toContain("const MAX_PAGES = 10");
    expect(source).toContain("if (added === 0)");
    expect(source).toContain("pagination made no progress");
    expect(source).toContain("if (!paginationComplete)");
    expect(source).toContain("exceeded the safe ${MAX_PAGES}-page pagination limit");
  });
});
