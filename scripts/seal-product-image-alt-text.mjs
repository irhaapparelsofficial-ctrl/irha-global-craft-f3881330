import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const EXPECTED_PRODUCTS = 254;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function replaceAttribute(tag, attribute, value) {
  const escaped = escapeHtml(value);
  const pattern = new RegExp(`\\b${attribute}=["'][^"']*["']`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, `${attribute}="${escaped}"`);
  return tag.replace(/\s*\/>$|>$/, (ending) => ` ${attribute}="${escaped}"${ending}`);
}

function sealMetaAlt(html, keyKind, key, alt) {
  const pattern = new RegExp(
    `<meta\\b(?=[^>]*data-irha-product-image=["']true["'])(?=[^>]*\\b${keyKind}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'])[^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing ${key} image-alt metadata`);
  return html.replace(match[0], replaceAttribute(match[0], "content", alt));
}

const manifest = JSON.parse(await readFile(join(DIST_DIR, "catalog-route-manifest.json"), "utf8"));
if (
  manifest.schemaVersion !== 1
  || manifest.productCount !== EXPECTED_PRODUCTS
  || !Array.isArray(manifest.products)
  || manifest.products.length !== EXPECTED_PRODUCTS
) {
  throw new Error("Product image-alt sealing requires the complete 254-product manifest");
}

let sealed = 0;
for (const product of manifest.products) {
  const outputPath = join(DIST_DIR, product.canonical_path.slice(1), "index.html");
  let html = await readFile(outputPath, "utf8");
  const alt = `${product.product_name} product style, view 1`;
  const imagePattern = /<img\b(?=[^>]*data-irha-primary-image=["']true["'])[^>]*>/i;
  const imageMatch = html.match(imagePattern);
  if (!imageMatch) throw new Error(`Primary image marker is missing: ${product.canonical_path}`);

  html = html.replace(imageMatch[0], replaceAttribute(imageMatch[0], "alt", alt));
  html = sealMetaAlt(html, "property", "og:image:alt", alt);
  html = sealMetaAlt(html, "name", "twitter:image:alt", alt);

  const sealedImage = html.match(imagePattern)?.[0] || "";
  const renderedAlt = decodeHtml(sealedImage.match(/\balt=["']([^"']*)["']/i)?.[1] || "");
  if (!renderedAlt.toLowerCase().includes(product.product_name.toLowerCase())) {
    throw new Error(`Sealed image alt does not identify ${product.product_name}: ${product.canonical_path}`);
  }
  if (/digital catalogue reference|product style;s/i.test(sealedImage)) {
    throw new Error(`Legacy or malformed image-alt text remains: ${product.canonical_path}`);
  }

  await writeFile(outputPath, html, "utf8");
  sealed += 1;
}

if (sealed !== EXPECTED_PRODUCTS) throw new Error(`Sealed ${sealed}/${EXPECTED_PRODUCTS} product image alts`);
console.log(`Sealed buyer-safe primary image alt text for ${sealed} canonical products`);
