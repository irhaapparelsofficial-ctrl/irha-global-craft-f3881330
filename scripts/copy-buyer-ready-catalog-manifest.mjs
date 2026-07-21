import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("public/catalog-route-manifest.json");
const target = resolve("dist/catalog-route-manifest.json");

if (!existsSync(source)) {
  throw new Error("Buyer-ready catalogue manifest was not generated in public/");
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

const payload = JSON.parse(readFileSync(target, "utf8"));
if (payload?.schemaVersion !== 1 || payload?.productCount !== 254 || payload?.products?.length !== 254) {
  throw new Error("Copied buyer-ready catalogue manifest is incomplete");
}

console.log("Copied and verified the 254-product buyer-ready catalogue manifest in dist/");
