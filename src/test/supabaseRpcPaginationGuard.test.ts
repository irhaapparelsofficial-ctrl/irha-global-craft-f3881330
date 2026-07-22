import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Supabase set-returning RPC pagination guard", () => {
  it("preloads the bounded compatibility shim for npm builds and exec commands", () => {
    const npmrc = readFileSync(resolve(".npmrc"), "utf8");
    expect(npmrc.trim()).toBe(
      "node-options=--import=./scripts/patch-supabase-rpc-pagination.mjs",
    );
  });

  it("translates ignored Range headers into PostgREST limit/offset queries", () => {
    const shim = readFileSync(
      resolve("scripts/patch-supabase-rpc-pagination.mjs"),
      "utf8",
    );

    expect(shim).toContain(
      'const RPC_PATH = "/rest/v1/rpc/get_public_legacy_redirects"',
    );
    expect(shim).toContain('url.searchParams.set("limit", String(range.limit))');
    expect(shim).toContain('url.searchParams.set("offset", String(range.offset))');
    expect(shim).toContain('headers.delete("range")');
  });

  it("fails closed on repeated pages or runaway pagination", () => {
    const shim = readFileSync(
      resolve("scripts/patch-supabase-rpc-pagination.mjs"),
      "utf8",
    );

    expect(shim).toContain("const MAX_PAGES = 100");
    expect(shim).toContain("pagination exceeded");
    expect(shim).toContain("repeated page data");
    expect(shim).toContain("response.clone().json()");
    expect(shim).not.toContain("return new Response(\"[]\")");
  });
});
