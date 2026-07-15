import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const redirects = readFileSync("public/_redirects", "utf8");
const worker = readFileSync("public/_worker.js", "utf8");

function setBlock(name: string): string {
  const match = worker.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`));
  if (!match) throw new Error(`${name} block not found`);
  return match[1];
}

describe("public legal route aliases", () => {
  it("permanently redirects historic privacy and terms paths", () => {
    expect(redirects).toContain("/privacy /privacy-policy 301");
    expect(redirects).toContain("/terms /terms-of-service 301");
    expect(worker).toContain('["/privacy", "/privacy-policy"]');
    expect(worker).toContain('["/terms", "/terms-of-service"]');
  });

  it("does not make legacy aliases indexable pages", () => {
    const exactPublicPaths = setBlock("EXACT_PUBLIC_PATHS");
    expect(exactPublicPaths).not.toContain('"/privacy",');
    expect(exactPublicPaths).not.toContain('"/terms",');
    expect(exactPublicPaths).toContain('"/privacy-policy",');
    expect(exactPublicPaths).toContain('"/terms-of-service",');
  });
});
