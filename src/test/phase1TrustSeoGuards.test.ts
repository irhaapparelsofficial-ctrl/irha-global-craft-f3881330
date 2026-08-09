import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { onRequest as discoveryMiddleware } from "../../functions/_middleware.js";
import { SCCI_BUSINESS_REFERENCE } from "../lib/publicBusinessEvidence.mjs";
import { PUBLIC_IDENTITY } from "../lib/publicIdentity.mjs";
import { STATIC_LEGACY_REDIRECTS, hasLoopOrSelfRedirect } from "../lib/legacyRedirects";

const root = (...parts: string[]) => resolve(process.cwd(), ...parts);
const read = (...parts: string[]) => readFileSync(root(...parts), "utf8");

const forbiddenPublicTrust = /newly built website|recently launched website|serving global B2B buyers|Provisional Certificate of Membership|SCCI provisional membership|pending Executive Committee|irhaapparelsofficial@gmail\.com|\+92\s*334\s*704\s*3612/i;

describe("Phase 1 public trust and SEO guards", () => {
  it("keeps the verified SCCI directory identity without certificate status or dates", () => {
    expect(SCCI_BUSINESS_REFERENCE.membershipNumber).toBe("A-101267");
    expect(SCCI_BUSINESS_REFERENCE.evidenceLabel).toBe("SCCI member-directory reference");
    expect(SCCI_BUSINESS_REFERENCE.verificationNote).toContain("does not establish certificate status");
    expect(SCCI_BUSINESS_REFERENCE.verificationNote).toContain("export history");
  });

  it("keeps one current public contact authority", () => {
    expect(PUBLIC_IDENTITY.email).toBe("info@irhaapparels.com");
    expect(PUBLIC_IDENTITY.telephoneHref).toBe("+923204110066");
    expect(PUBLIC_IDENTITY.whatsappNumber).toBe("923204110066");
    for (const path of ["public/llms.txt", "public/llms-full.txt", "src/pages/BuyerTrust.tsx"]) {
      const text = read(path);
      expect(text).not.toMatch(/irhaapparelsofficial@gmail\.com/i);
      expect(text).not.toMatch(/\+92\s*334\s*704\s*3612/i);
    }
  });

  it("does not publish website-age or unsupported SCCI wording from active trust surfaces", () => {
    for (const path of [
      "src/lib/publicBusinessEvidence.mjs",
      "src/pages/BuyerTrust.tsx",
      "src/components/sections/BuyerDecisionSection.tsx",
      "public/llms.txt",
      "public/llms-full.txt",
    ]) {
      expect(read(path), path).not.toMatch(forbiddenPublicTrust);
    }
  });

  it("keeps curated legacy aliases one-hop and sends catalogue aliases directly to products", () => {
    expect(hasLoopOrSelfRedirect(STATIC_LEGACY_REDIRECTS)).toBe(false);
    expect(STATIC_LEGACY_REDIRECTS.find((rule) => rule.from === "/catalog")?.to).toBe("/products");
    expect(STATIC_LEGACY_REDIRECTS.find((rule) => rule.from === "/catalogs/master-catalogue-2026.pdf")?.to).toBe("/products");

    const redirects = read("public/_redirects");
    expect(redirects).toContain("/catalog /products 301");
    expect(redirects).not.toContain("/catalogue/* /products 301");
    expect(redirects).not.toContain("BEGIN GENERATED TAXONOMY REDIRECTS");
  });

  it("serves the advertised API catalog as Linkset JSON without falling through to HTML", async () => {
    let nextCalled = false;
    const response = await discoveryMiddleware({
      request: new Request("https://irhaapparels.com/.well-known/api-catalog"),
      next: async () => {
        nextCalled = true;
        return new Response("<html>wrong</html>", { headers: { "content-type": "text/html" } });
      },
    });

    expect(nextCalled).toBe(false);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/linkset+json");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const payload = await response.json();
    expect(Array.isArray(payload.linkset)).toBe(true);
    expect(payload.linkset.length).toBeGreaterThan(0);
  });

  it("keeps the runtime footer in the ordinary public layout rather than a 30-second viewport gate", () => {
    const layout = read("src/components/layout/Layout.tsx");
    expect(layout).toContain("<FooterChrome />");
    expect(layout).not.toContain("fallbackDelayMs={30_000}");
    expect(layout).not.toContain('import ViewportDeferred from "@/components/performance/ViewportDeferred"');
  });

  it("keeps a final build-stage parity and truth contract after all static writers", () => {
    const versioner = read("scripts/version-official-brand-assets.mjs");
    const finalizer = read("scripts/finalize-phase1-public-contract.mjs");
    expect(versioner).toContain('await import("./finalize-phase1-public-contract.mjs")');
    expect(finalizer).toContain("Title parity failed");
    expect(finalizer).toContain("H1 parity failed");
    expect(finalizer).toContain("HTML lang parity failed");
    expect(finalizer).toContain("Sitemap/manifest equality failed");
    expect(finalizer).toContain("Canonical points to a redirect");
    expect(finalizer).toContain("application/linkset+json");
    expect(finalizer).toContain("phase-1-legacy-route-inventory.csv");
  });

  it("keeps standards references qualified rather than representing them as Irha credentials", () => {
    const buyerInfo = read("src/data/buyerCapabilities.ts");
    expect(buyerInfo).toContain("Their mention is not a claim that Irha Apparels currently holds them.");
    expect(buyerInfo).not.toMatch(/Irha Apparels (?:is|holds?) (?:ISO|OEKO-TEX|GOTS|BSCI|SEDEX|WRAP) certified/i);
  });
});
