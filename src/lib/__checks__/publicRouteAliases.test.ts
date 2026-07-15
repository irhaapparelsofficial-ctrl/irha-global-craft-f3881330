import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const redirects = readFileSync("public/_redirects", "utf8");
const worker = readFileSync("public/_worker.js", "utf8");

describe("public legal route aliases", () => {
  it("permanently redirects historic privacy and terms paths", () => {
    expect(redirects).toContain("/privacy /privacy-policy 301");
    expect(redirects).toContain("/terms /terms-of-service 301");
    expect(worker).toContain('["/privacy", "/privacy-policy"]');
    expect(worker).toContain('["/terms", "/terms-of-service"]');
  });

  it("does not make legacy aliases indexable pages", () => {
    expect(worker).not.toMatch(/EXACT_PUBLIC_PATHS[\s\S]*?"\/privacy",/);
    expect(worker).not.toMatch(/EXACT_PUBLIC_PATHS[\s\S]*?"\/terms",/);
  });
});
