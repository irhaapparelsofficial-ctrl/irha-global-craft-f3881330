import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Irha favicon branding", () => {
  it("uses one stable branded square favicon across search metadata and fallbacks", () => {
    const index = read("index.html");
    const favicon = read("public/favicon.svg");
    const redirects = read("public/_redirects");
    const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
      icons: Array<{ src: string; sizes: string; type: string }>;
    };

    expect(index).toContain(
      '<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg" />',
    );
    expect(index).toContain('<link rel="shortcut icon" href="/favicon.svg" />');
    expect(index.toLowerCase()).not.toContain("lovable favicon");

    expect(favicon).toContain('viewBox="0 0 160 160"');
    expect(favicon).toContain('fill="#0b2747"');
    expect(favicon).toContain('stroke="#d5ad4d"');

    expect(redirects).toContain("/favicon.ico /favicon.svg 301");
    expect(manifest.icons[0]).toEqual({
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    });
  });
});
