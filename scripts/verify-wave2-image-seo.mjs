import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const HOLD_DIR = resolve(".wave2-image-seo-hold");
const SITEMAP_PATH = join(DIST_DIR, "sitemap.xml");
const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const TEMPORARY_PATHS = new Set([
  "/de/",
  "/fr/",
  "/fr/fabricant-vetements",
  "/fr/fabricant-vetements-sport",
  "/fr/fabricant-vetements-cuir",
  "/fr/fabrication-marque-blanche",
  "/nl/",
  "/nl/kledingfabrikant",
  "/nl/sportkleding-fabrikant",
  "/nl/leren-kleding-fabrikant",
  "/nl/private-label-kleding",
]);

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

function ensureSitemapNamespaces(xml) {
  const rootPattern = /<urlset\b([^>]*)>/i;
  const root = xml.match(rootPattern)?.[0];
  if (!root) throw new Error("Sitemap has no urlset root before image verification");
  let nextRoot = root;
  if (!/\bxmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/i.test(nextRoot)) {
    throw new Error("Sitemap image namespace is missing before image verification");
  }
  if (/\bxhtml:/i.test(xml) && !/\bxmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/i.test(nextRoot)) {
    nextRoot = nextRoot.replace(/>$/, ` xmlns:xhtml="${XHTML_NAMESPACE}">`);
  }
  const output = xml.replace(rootPattern, nextRoot);
  if (/\bxhtml:/i.test(output) && !output.includes(`xmlns:xhtml="${XHTML_NAMESPACE}"`)) {
    throw new Error("Sitemap hreflang namespace could not be restored");
  }
  return output;
}

function stripTemporarySitemapRoutes(xml) {
  return xml.replace(/\s*<url>[\s\S]*?<\/url>/gi, (block) => {
    const raw = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.replace(/&amp;/g, "&");
    if (!raw) return block;
    const pathname = new URL(raw).pathname;
    return TEMPORARY_PATHS.has(pathname) ? "" : block;
  });
}

function runVerifier() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ["scripts/verify-built-image-seo.mjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        IRHA_IMAGE_SEO_TEMPORARY_PATHS: JSON.stringify([...TEMPORARY_PATHS]),
      },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Image SEO verifier failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`));
    });
  });
}

await rm(HOLD_DIR, { recursive: true, force: true });
await mkdir(HOLD_DIR, { recursive: true });
const originalSitemap = ensureSitemapNamespaces(await readFile(SITEMAP_PATH, "utf8"));
const moved = [];

try {
  await writeFile(SITEMAP_PATH, originalSitemap, "utf8");
  for (const locale of ["fr", "nl"]) {
    const source = join(DIST_DIR, locale);
    if (await exists(join(source, "index.html"))) {
      const target = join(HOLD_DIR, locale);
      await rename(source, target);
      moved.push([target, source]);
    }
  }

  const germanGateway = join(DIST_DIR, "de", "index.html");
  if (await exists(germanGateway)) {
    const target = join(HOLD_DIR, "de-index.html");
    await rename(germanGateway, target);
    moved.push([target, germanGateway]);
  }

  await writeFile(SITEMAP_PATH, stripTemporarySitemapRoutes(originalSitemap), "utf8");
  await runVerifier();
} finally {
  await writeFile(SITEMAP_PATH, originalSitemap, "utf8");
  for (const [source, target] of moved.reverse()) {
    await mkdir(resolve(target, ".."), { recursive: true });
    await rename(source, target);
  }
  await rm(HOLD_DIR, { recursive: true, force: true });
}

console.log(`Verified image SEO against the authoritative manifest with ${TEMPORARY_PATHS.size} localized routes held for final i18n processing and hreflang namespace preserved`);
