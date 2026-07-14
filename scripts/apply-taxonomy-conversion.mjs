import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const chunkPaths = [
  "scripts/taxonomy.patch.1",
  "scripts/taxonomy.patch.2",
  "scripts/taxonomy.patch.3",
  "scripts/taxonomy.patch.4",
];
const patch = chunkPaths.map((path) => readFileSync(path, "utf8")).join("");
const test = readFileSync("scripts/categoryTaxonomyConversion.test.ts", "utf8");
const patchPath = "/tmp/taxonomy-conversion.patch";

writeFileSync(patchPath, patch);
execFileSync("git", ["apply", "--check", patchPath], { stdio: "inherit" });
execFileSync("git", ["apply", patchPath], { stdio: "inherit" });
writeFileSync("src/lib/__checks__/categoryTaxonomyConversion.test.ts", test);

for (const path of [
  ...chunkPaths,
  "scripts/categoryTaxonomyConversion.test.ts",
  "scripts/taxonomy-patch.ready",
  "scripts/apply-taxonomy-conversion.mjs",
  ".github/workflows/apply-taxonomy-conversion.yml",
]) {
  rmSync(path);
}
