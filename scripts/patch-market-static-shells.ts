import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MARKET_PAGES, type MarketPage } from "../src/lib/marketPages";

const DIST_DIR = resolve("dist");
const SITE_URL = "https://irhaapparels.com";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceAttribute(html: string, pattern: RegExp, replacement: string) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function marketShell(market: MarketPage) {
  const programLinks = market.priorityPrograms
    .map((program) => `<li><a href="${escapeHtml(program.href)}" style="color:#e8c477">${escapeHtml(program.label)}</a> — ${escapeHtml(program.note)}</li>`)
    .join("\n");
  const sectionText = market.sections
    .map((section) => `<section style="margin-top:28px"><h2 style="font-size:24px;margin:0 0 8px">${escapeHtml(section.heading)}</h2><p style="color:#d7d0c4">${escapeHtml(section.body)}</p></section>`)
    .join("\n");

  return `<main id="irha-static-crawler-shell" data-irha-route-shell="/markets/${escapeHtml(market.slug)}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;padding:48px 24px;font-family:Arial,sans-serif;line-height:1.6">
    <div style="max-width:960px;margin:0 auto">
      <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">${escapeHtml(market.eyebrow)}</p>
      <h1 style="margin:0 0 20px;font-size:clamp(34px,7vw,68px);line-height:1.08">${escapeHtml(market.h1)}</h1>
      <p style="max-width:820px;font-size:18px;color:#d7d0c4">${escapeHtml(market.intro)}</p>
      <h2 style="font-size:26px;margin:34px 0 10px">Product programs to review</h2>
      <ul style="padding-left:20px;color:#d7d0c4">${programLinks}</ul>
      ${sectionText}
      <p style="max-width:820px;color:#aaa29a;margin-top:28px">Irha Apparels is an experienced manufacturer and the current website is newly built. MOQ, pricing, production timing, shipping and documentation are confirmed after the buyer's requirements are reviewed.</p>
      <nav aria-label="Market crawler links" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:34px">
        <a href="/markets" style="color:#e8c477">All Markets</a>
        <a href="/products" style="color:#e8c477">Products</a>
        <a href="/factory-video-call" style="color:#e8c477">Live Factory View</a>
        <a href="/inquiry" style="color:#e8c477">Request a Quote</a>
      </nav>
    </div>
  </main>`;
}

function hubShell() {
  const links = MARKET_PAGES.map((market) => `<li><a href="/markets/${escapeHtml(market.slug)}" style="color:#e8c477">${escapeHtml(market.country)}</a> — ${escapeHtml(market.summary)}</li>`).join("\n");
  return `<main id="irha-static-crawler-shell" data-irha-route-shell="/markets" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;padding:48px 24px;font-family:Arial,sans-serif;line-height:1.6">
    <div style="max-width:960px;margin:0 auto">
      <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">International buyer coverage</p>
      <h1 style="margin:0 0 20px;font-size:clamp(34px,7vw,68px);line-height:1.08">International B2B Apparel Markets</h1>
      <p style="max-width:820px;font-size:18px;color:#d7d0c4">Country-specific sourcing guidance for importers, wholesalers, private-label brands, retailers and sports buyers working with Irha Apparels.</p>
      <ul style="padding-left:20px;color:#d7d0c4;margin-top:30px">${links}</ul>
      <nav aria-label="Market hub crawler links" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:34px"><a href="/products" style="color:#e8c477">Products</a><a href="/manufacturing" style="color:#e8c477">Manufacturing</a><a href="/inquiry" style="color:#e8c477">Request a Quote</a></nav>
    </div>
  </main>`;
}

async function patch(path: string, title: string, description: string, locale: string, shell: string) {
  const file = resolve(DIST_DIR, path.replace(/^\//, ""), "index.html");
  let html = await readFile(file, "utf8");
  const canonical = `${SITE_URL}${path}`;
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);

  html = replaceAttribute(html, /<html lang="[^"]*">/i, `<html lang="${escapeHtml(locale)}">`);
  html = replaceAttribute(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`);
  html = replaceAttribute(html, /<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${escapedDescription}" />`);
  html = replaceAttribute(html, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`);
  html = replaceAttribute(html, /<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${escapedTitle}" />`);
  html = replaceAttribute(html, /<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${escapedDescription}" />`);
  html = replaceAttribute(html, /<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${canonical}" />`);
  html = replaceAttribute(html, /<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${escapedTitle}" />`);
  html = replaceAttribute(html, /<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${escapedDescription}" />`);
  html = html.replace(/<main id="irha-static-crawler-shell"[\s\S]*?<\/main>/i, shell);
  await writeFile(file, html, "utf8");
}

async function main() {
  await patch(
    "/markets",
    "International B2B Apparel Markets | Irha Apparels",
    "Country-specific sourcing pages for apparel importers, wholesalers, private-label brands, retailers and sports buyers in nine priority markets.",
    "en",
    hubShell(),
  );

  for (const market of MARKET_PAGES) {
    await patch(`/markets/${market.slug}`, market.title, market.description, market.locale, marketShell(market));
  }
  console.log(`patched static crawler shells for ${MARKET_PAGES.length + 1} market routes`);
}

void main();
