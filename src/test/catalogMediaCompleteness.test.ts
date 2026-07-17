import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["src", "scripts"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".json"]);
const MEDIA_REFERENCE = /["'`]\/(product-media|images|assets|category-media|catalog-media)\/[^"'`?\s]+\.(?:avif|webp|png|jpe?g|svg)(?:\?[^"'`\s]*)?["'`]/gi;

function walk(directory: string): string[] {
  const absolute = resolve(ROOT, directory);
  if (!existsSync(absolute)) return [];

  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(absolute, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) return [];
      return walk(relative(ROOT, child));
    }
    return TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase()) ? [child] : [];
  });
}

function literalMediaReferences(): Array<{ source: string; publicPath: string }> {
  const references: Array<{ source: string; publicPath: string }> = [];

  for (const file of SOURCE_ROOTS.flatMap(walk)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(MEDIA_REFERENCE)) {
      const quoted = match[0];
      const path = quoted.slice(1, -1).split("?", 1)[0];
      references.push({ source: relative(ROOT, file), publicPath: path });
    }
  }

  return references.filter(
    (reference, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.source === reference.source && candidate.publicPath === reference.publicPath,
      ) === index,
  );
}

describe("Catalogue media completeness", () => {
  it("ships every literal catalogue media reference as a non-empty public file", () => {
    const references = literalMediaReferences();
    const missing: string[] = [];
    const empty: string[] = [];

    for (const reference of references) {
      const publicFile = resolve(ROOT, "public", reference.publicPath.replace(/^\//, ""));
      if (!existsSync(publicFile)) {
        missing.push(`${reference.publicPath} referenced by ${reference.source}`);
        continue;
      }
      if (statSync(publicFile).size < 256) {
        empty.push(`${reference.publicPath} referenced by ${reference.source}`);
      }
    }

    expect(references.length).toBeGreaterThan(0);
    expect(missing, `Missing catalogue media:\n${missing.join("\n")}`).toEqual([]);
    expect(empty, `Empty or invalid catalogue media:\n${empty.join("\n")}`).toEqual([]);
  });

  it("keeps the published product surfaces on semantic image fallbacks", () => {
    const detail = readFileSync(resolve(ROOT, "src/pages/CanonicalProductDetail.tsx"), "utf8");
    const finder = readFileSync(resolve(ROOT, "src/pages/AllProductsPage.tsx"), "utf8");
    const thumbnail = readFileSync(resolve(ROOT, "src/components/ThumbnailImage.tsx"), "utf8");

    expect(detail).toContain("fallbackSrc={fallbackImage}");
    expect(finder).toContain("<ThumbnailImage");
    expect(thumbnail).toContain("setFailed(true)");
    expect(thumbnail).toContain("fallbackSrc");
  });
});
