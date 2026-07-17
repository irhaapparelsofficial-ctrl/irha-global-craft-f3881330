import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const publicDir = resolve(process.cwd(), "public");
const prefixes = [".image-build-", ".thumbnail-build-"];

if (!existsSync(publicDir)) process.exit(0);

const removed = [];
for (const entry of readdirSync(publicDir, { withFileTypes: true })) {
  if (!entry.isDirectory() || !prefixes.some((prefix) => entry.name.startsWith(prefix))) continue;
  rmSync(resolve(publicDir, entry.name), { recursive: true, force: true });
  removed.push(entry.name);
}

console.log(removed.length
  ? `[public-clean] removed transient workspaces: ${removed.join(", ")}`
  : "[public-clean] no transient image workspaces found");
