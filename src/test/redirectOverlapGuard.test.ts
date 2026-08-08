import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("redirect source ownership", () => {
  it("keeps approved product aliases in the DB-backed generated registry only", () => {
    const redirects = read("public/_redirects");
    const generator = read("scripts/generate-buyer-ready-redirects.ts");
    const plushSource = "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe";

    expect(redirects).not.toContain(plushSource);
    expect(redirects).not.toContain("# BEGIN GENERATED TAXONOMY REDIRECTS");
    expect(generator).toContain("# BEGIN GENERATED BUYER-READY REDIRECTS");
    expect(generator).toContain("fetchAllApprovedRedirects");
    expect(generator).toContain("get_public_legacy_redirects");
    expect(generator).toContain("approvedRows.forEach(add)");
  });

  it("deduplicates identical static/generated sources and rejects conflicts", () => {
    const generator = read("scripts/generate-buyer-ready-redirects.ts");

    expect(generator).toContain("const staticRedirects = new Map<string, string>()");
    expect(generator).toContain("Duplicate static redirect source");
    expect(generator).toContain("Static/generated redirect conflict");
    expect(generator).toContain("if (staticTarget !== to)");
    expect(generator).toContain("non-overlapping one-hop redirects");
  });
});
