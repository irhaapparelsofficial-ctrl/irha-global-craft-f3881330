import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("mobile admin easy products mode", () => {
  it("keeps floating admin launchers off the mobile editing surface", () => {
    const main = read("src/main.tsx");
    const app = read("src/App.tsx");
    const runtime = read("src/components/admin/AdminRuntime.tsx");
    const css = read("src/admin-mobile-focus.css");

    expect(main).not.toContain("admin-mobile-focus.css");
    expect(app).toContain('if (!pathname.startsWith("/admin")) return null');
    expect(runtime).toContain('import "@/admin-mobile-focus.css"');
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toContain('[aria-label="Open AI outreach command center"]');
    expect(css).toContain('[aria-label="Open Buyer Actions"]');
    expect(css).toContain('[aria-label="Open Lead Alerts"]');
    expect(css).toContain('[aria-label="Open human live chat console"]');
    expect(css).toContain("display: none !important");
  });

  it("keeps advanced product checks collapsed until the owner opens them", () => {
    const source = read("src/components/admin/CatalogReleaseStatus.tsx");

    expect(source.match(/<details/g)?.length).toBe(2);
    expect(source).toContain("Optional product check");
    expect(source).toContain("Advanced catalog check");
    expect(source).toContain("<ProductQualityCenter />");
    expect(source).not.toContain("<ProductQualityCenter />\n      <section");
  });
});
