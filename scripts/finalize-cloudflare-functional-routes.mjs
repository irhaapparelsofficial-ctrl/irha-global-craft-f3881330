import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const workerPath = resolve("dist/_worker.js");
const before = `  if (FUNCTIONAL_SPA_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return null;
  if (!isPublishedHtmlRoute(normalized)) return null;`;
const after = `  if (FUNCTIONAL_SPA_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return null;
  if (normalized.endsWith("/spec-sheet")) return null;
  if (!isPublishedHtmlRoute(normalized)) return null;`;

async function main() {
  const worker = await readFile(workerPath, "utf8");
  if (!worker.includes(before)) {
    throw new Error("Cloudflare functional catalogue route block changed; spec-sheet finalization was not applied");
  }

  const finalized = worker.replace(before, after);
  if (!finalized.includes('normalized.endsWith("/spec-sheet")')) {
    throw new Error("Cloudflare worker is missing the exact valid spec-sheet SPA exception");
  }

  await writeFile(workerPath, finalized, "utf8");
  console.log("Finalized exact published spec-sheet routes as SPA responses while unknown spec sheets remain 404");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
