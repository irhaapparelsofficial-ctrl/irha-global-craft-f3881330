import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";

const workerPath = new URL("../dist/_worker.js", import.meta.url);
const guideModulePath = new URL("../dist/_worker-guide.js", import.meta.url);
const importLine = 'import { handleIrhaGuideRequest } from "./_worker-guide.js";';
const robotsAnchor = '    if ((request.method === "GET" || request.method === "HEAD") && pathname === "/robots.txt") {';
const guideRoute = '    if (pathname === "/api/guide") return handleIrhaGuideRequest(request, env);';

await access(workerPath, constants.R_OK | constants.W_OK);
await access(guideModulePath, constants.R_OK);

let source = await readFile(workerPath, "utf8");

if (!source.includes(importLine)) {
  source = `${importLine}\n\n${source}`;
}

if (!source.includes(guideRoute)) {
  if (!source.includes(robotsAnchor)) {
    throw new Error("Cloudflare worker robots anchor changed; refusing unsafe AI route injection.");
  }
  source = source.replace(robotsAnchor, `${guideRoute}\n\n${robotsAnchor}`);
}

const importCount = source.split(importLine).length - 1;
const routeCount = source.split(guideRoute).length - 1;
if (importCount !== 1 || routeCount !== 1) {
  throw new Error(`Cloudflare AI guide injection is not idempotent: import=${importCount}, route=${routeCount}`);
}

await writeFile(workerPath, source, "utf8");
console.log("Installed guarded /api/guide Workers AI route in dist/_worker.js");
