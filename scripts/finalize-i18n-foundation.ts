import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { GERMAN_GATEWAY_CONTENT } from "../src/lib/germanGatewayContent";
import {
  getHreflangAlternates,
  getLanguageDestination,
  getPublishedLocalizedRoutes,
  getPublishedRoute,
  getRouteDirection,
  getRouteLocale,
  getXDefaultPath,
  isPublishedLocalizedRoute,
  LOCALE_REGISTRY,
  normalizeRoutePath,
  SHARED_UI_COPY,
  type LocaleCode,
} from "../src/lib/i18nFoundation";

const DIST_DIR = resolve("dist");
const SITEMAP_PATH = join(DIST_DIR, "sitemap.xml");
const SITE_URL = "https://irhaapparels.com";
const EXPECTED_SITEMAP_URLS = 418;
const EXPECTED_LOCALIZED_ROUTES: Readonly<Record<Exclude<LocaleCode, "en">, number>> = { de: 8, fr: 5, nl: 5 };
const SELECTOR_LOCALES: readonly LocaleCode[] = ["en", "de", "fr", "nl"];

function escapeHtml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
function absolute(path: string): string { return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`; }
function routeFromFile(file: string): string { const rel = relative(DIST_DIR, dirname(file)).split(sep).join("/"); return rel === "" ? "/" : normalizeRoutePath(`/${rel}/`); }

function ensureGermanEntryInSitemap(xml: string): string {
  const entryUrl = absolute("/de/");
  if (xml.includes(`<loc>${entryUrl}</loc>`)) return xml;
  if (!xml.includes("</urlset>")) throw new Error("Built sitemap is missing </urlset>");
  const today = new Date().toISOString().slice(0, 10);
  const entry = ["  <url>", `    <loc>${entryUrl}</loc>`, `    <lastmod>${today}</lastmod>`, "    <changefreq>monthly</changefreq>", "    <priority>0.90</priority>", "  </url>"].join("\n");
  return xml.replace("</urlset>", `${entry}\n</urlset>`);
}

function selectorMarkup(pathname: string): string {
  const locale = getRouteLocale(pathname);
  const links = SELECTOR_LOCALES.map((candidate) => {
    const definition = LOCALE_REGISTRY[candidate];
    const active = candidate === locale;
    return `<a href="${escapeHtml(getLanguageDestination(pathname, candidate))}" hreflang="${definition.hreflangCode}" lang="${candidate}"${active ? ' aria-current="page"' : ""} style="color:${active ? "#0a0a0a" : "#e8c477"};background:${active ? "#e8c477" : "transparent"};border:1px solid #6b5a34;padding:7px 11px;text-decoration:none">${escapeHtml(definition.nativeName)}</a>`;
  }).join("");
  return `<nav data-irha-language-selector="static" aria-label="${escapeHtml(SHARED_UI_COPY[locale].languageSelectorLabel)}" style="display:flex;justify-content:flex-end;gap:8px;padding:8px 18px;background:#080808;border-bottom:1px solid #292929;font-family:Arial,sans-serif;font-size:12px;flex-wrap:wrap">${links}</nav>`;
}

function germanBavarianShell(): string {
  return `<main id="irha-static-crawler-shell" data-irha-german-bavarian-shell="published" lang="de" style="max-width:1120px;margin:0 auto;padding:52px 24px 68px;background:#0a0a0a;color:#f5f1e8;font-family:Arial,sans-serif;line-height:1.65"><p style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">Deutsch · Trachtenbeschaffung für den DACH-Markt</p><h1 style="max-width:920px;font-family:Georgia,serif;font-size:clamp(36px,7vw,68px);line-height:1.06">Trachtenfertigung für Großhandel und Eigenmarken</h1><p style="max-width:840px;font-size:18px;color:#d7d0c4">Irha Apparels fertigt Lederhosen-, Dirndl- und Trachtenprogramme in Sialkot, Pakistan, für gewerbliche Einkäufer in Deutschland, Österreich und der Schweiz. Material, Ausführung, Mengenbereich, Größen, Branding, Verpackung und Lieferverantwortung werden vor einer verbindlichen Zusage geprüft.</p><p style="max-width:840px;color:#c8c0b5">Keine Einzelhandelsangebote, keine pauschalen Festpreise und keine allgemeine Mindestmenge. Senden Sie Produktreferenz, Mengenbereich, Größenlauf und gewünschte Ausstattung für eine technische Angebotsprüfung.</p><nav aria-label="Trachtenprogramme im englischen Produktkatalog" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:32px"><a href="/products/bavarian-trachten-wear/men" hreflang="en" lang="en" style="border:1px solid #40392e;padding:18px;color:#e8c477;text-decoration:none">Herren · englischer Katalog</a><a href="/products/bavarian-trachten-wear/women" hreflang="en" lang="en" style="border:1px solid #40392e;padding:18px;color:#e8c477;text-decoration:none">Damen · englischer Katalog</a><a href="/products/bavarian-trachten-wear/kids" hreflang="en" lang="en" style="border:1px solid #40392e;padding:18px;color:#e8c477;text-decoration:none">Kinder · englischer Katalog</a><a href="/products/bavarian-trachten-wear" hreflang="en" lang="en" style="border:1px solid #40392e;padding:18px;color:#e8c477;text-decoration:none">Accessoires und vollständiger Katalog</a></nav><section style="margin-top:36px;border-top:1px solid #302b24;padding-top:26px"><h2 style="font-size:30px;color:#e8c477">Fertigungs- und Freigabeumfang</h2><ul style="columns:2;max-width:850px;color:#c8c0b5"><li>OEM-, ODM- und Private-Label-Fertigung nach technischer Prüfung</li><li>Material-, Farb-, Besatz- und Stickereianpassung</li><li>Größenläufe für Großhandel und Fachhandel</li><li>Musterentwicklung und dokumentierte Käuferfreigabe</li><li>Etiketten, Hangtags und Verpackung nach freigegebenen Daten</li><li>Live-Fabrikbesichtigung per Video nach Terminvereinbarung</li></ul></section><nav aria-label="B2B-Anfrage" style="display:flex;flex-wrap:wrap;gap:12px;margin-top:30px"><a href="/inquiry?intent=rfq&amp;source=%2Fde%2Fbavarian-wear" style="background:#e8c477;color:#090909;padding:12px 18px;text-decoration:none;font-weight:700">Trachtenprojekt anfragen</a><a href="/factory-video-call" style="border:1px solid #675a40;color:#f5f1e8;padding:11px 18px;text-decoration:none">Fabrik per Video besichtigen</a></nav></main>`;
}

function localizeGermanSharedShell(html: string, path: string): string {
  let output = html
    .replace(/>Products</g, ">Produktkatalog (Englisch)<")
    .replace(/>Buyer Trust</g, ">Informationen für Einkäufer<")
    .replace(/>Factory Video Call</g, ">Fabrik per Video besichtigen<")
    .replace(/>Request Quote</g, ">Angebot anfragen<")
    .replace(/>Explore related products</g, ">Englischen Produktkatalog öffnen<")
    .replace(/>Buyer FAQ</g, ">FAQ für Einkäufer<")
    .replace(/>Contact</g, ">Kontakt<")
    .replace(/>Privacy</g, ">Datenschutz (Englisch)<")
    .replace(/>Related sourcing pages</g, ">Weitere Beschaffungsseiten<")
    .replace(/B2B manufacturing/g, "B2B-Fertigung")
    .replace("Experienced manufacturer in Sialkot, Pakistan. The website is newly built, and qualified buyers may request a live factory video call before placing an order.", "Erfahrener Bekleidungshersteller in Sialkot, Pakistan. Qualifizierte Einkäufer können vor einer Bestellung eine Live-Fabrikbesichtigung per Video vereinbaren.");
  if (path === "/de/bavarian-wear") output = output.replace(/<main id=["']irha-static-crawler-shell["'][\s\S]*?<\/main>/i, germanBavarianShell());
  return output;
}
function removeAlternates(html: string): string { return html.replace(/\s*<link\s+rel=["']alternate["'][^>]*>/gi, ""); }

function setHead(html: string, path: string): string {
  const registered = getPublishedRoute(path);
  const locale = getRouteLocale(path);
  const direction = getRouteDirection(path);
  let output = html.replace(/<html\s+lang=["'][^"']*["'](?:\s+dir=["'][^"']*["'])?/i, `<html lang="${locale}" dir="${direction}"`);
  if (registered) {
    output = output
      .replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?\s*>/i, `<link rel="canonical" href="${absolute(registered.path)}" />`)
      .replace(/<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?\s*>/i, '<meta name="robots" content="index,follow,max-image-preview:large" />');
    output = removeAlternates(output);
    const alternates = getHreflangAlternates(path).map((item) => `    <link rel="alternate" hreflang="${item.locale}" href="${absolute(item.href)}" />`);
    alternates.push(`    <link rel="alternate" hreflang="x-default" href="${absolute(getXDefaultPath(path))}" />`);
    output = output.replace("</head>", `${alternates.join("\n")}\n  </head>`);
  } else if (["de", "fr", "nl"].includes(locale)) {
    output = output.replace(/<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?\s*>/i, '<meta name="robots" content="noindex,follow,max-image-preview:large" />');
  }
  if (locale === "de") output = localizeGermanSharedShell(output, path);
  if (!output.includes('data-irha-language-selector="static"')) output = output.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${selectorMarkup(path)}`);
  return output;
}

function germanGatewayShell(): string {
  const page = GERMAN_GATEWAY_CONTENT;
  const links = page.links.map((item) => `<article style="border:1px solid #302b24;padding:22px;background:#111"><h2 style="margin:0 0 8px;font-size:24px"><a href="${item.href}" hreflang="de" style="color:#e8c477;text-decoration:none">${escapeHtml(item.title)}</a></h2><p style="margin:0;color:#c8c0b5">${escapeHtml(item.description)}</p></article>`).join("");
  return `<main id="irha-static-crawler-shell" data-irha-german-gateway="published" lang="de" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;padding:48px 22px 64px;font-family:Arial,sans-serif;line-height:1.65"><div style="max-width:1120px;margin:0 auto"><p style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">${escapeHtml(page.eyebrow)}</p><h1 style="max-width:950px;font-family:Georgia,serif;font-size:clamp(36px,7vw,70px);line-height:1.05;margin:12px 0 20px">${escapeHtml(page.h1)}</h1><p style="max-width:840px;font-size:18px;color:#d7d0c4">${escapeHtml(page.intro)}</p><p style="max-width:840px;border-left:2px solid #e8c477;padding-left:16px;color:#bdb5a8">${escapeHtml(page.scopeNote)}</p><nav aria-label="B2B-Aktionen" style="display:flex;flex-wrap:wrap;gap:12px;margin:28px 0 42px"><a href="/inquiry?intent=rfq&amp;source=%2Fde%2F" style="background:#e8c477;color:#090909;padding:12px 18px;text-decoration:none;font-weight:700">${escapeHtml(page.primaryCta)}</a><a href="/products" hreflang="en" lang="en" style="border:1px solid #675a40;color:#e8c477;padding:11px 18px;text-decoration:none">${escapeHtml(page.secondaryCta)}</a><a href="/factory-video-call" style="border:1px solid #675a40;color:#f5f1e8;padding:11px 18px;text-decoration:none">${escapeHtml(page.factoryCta)}</a></nav><section aria-labelledby="de-pages"><h2 id="de-pages" style="font-size:34px">${escapeHtml(page.sectionTitle)}</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">${links}</div></section><section style="margin-top:42px;border-top:1px solid #302b24;padding-top:28px"><h2 style="font-size:32px;color:#e8c477">${escapeHtml(page.trustTitle)}</h2><p style="max-width:860px;color:#c8c0b5">${escapeHtml(page.trustBody)}</p></section></div></main>`;
}

function buildGermanEntry(template: string): string {
  const page = GERMAN_GATEWAY_CONTENT;
  let html = template
    .replace(/<html\s+lang=["'][^"']*["'](?:\s+dir=["'][^"']*["'])?/i, '<html lang="de" dir="ltr"')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta[^>]+name=["']description["'][^>]*>/i, `<meta data-irha-fallback-seo="true" name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta\s+name=["']robots["'][^>]*>/i, '<meta name="robots" content="index,follow,max-image-preview:large" />')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${absolute(page.path)}" />`)
    .replace(/<meta[^>]+property=["']og:title["'][^>]*>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta[^>]+property=["']og:description["'][^>]*>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta[^>]+property=["']og:url["'][^>]*>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${absolute(page.path)}" />`)
    .replace(/<meta[^>]+property=["']og:locale["'][^>]*>/i, '<meta property="og:locale" content="de_DE" />');
  html = removeAlternates(html);
  html = html.replace("</head>", `    <link rel="alternate" hreflang="de" href="${absolute(page.path)}" />\n    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/" />\n  </head>`);
  const rawShellPattern = /<main\s+id=["']irha-static-crawler-shell["'][\s\S]*?<\/main>/i;
  if (!rawShellPattern.test(html)) throw new Error("Could not find the raw shell for the German gateway");
  html = html.replace(rawShellPattern, germanGatewayShell());
  if (!html.includes('data-irha-language-selector="static"')) html = html.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${selectorMarkup(page.path)}`);
  return html;
}

async function listHtmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => entry.isDirectory() ? listHtmlFiles(join(directory, entry.name)) : [join(directory, entry.name)]));
  return files.flat().filter((file) => file.endsWith("index.html"));
}

async function main() {
  const rootTemplate = await readFile(join(DIST_DIR, "index.html"), "utf8");
  const germanOutput = join(DIST_DIR, "de", "index.html");
  await mkdir(dirname(germanOutput), { recursive: true });
  await writeFile(germanOutput, buildGermanEntry(rootTemplate), "utf8");
  const files = await listHtmlFiles(DIST_DIR);
  for (const file of files) {
    const route = routeFromFile(file);
    const html = await readFile(file, "utf8");
    await writeFile(file, setHead(html, route), "utf8");
  }
  const sitemap = ensureGermanEntryInSitemap(await readFile(SITEMAP_PATH, "utf8"));
  await writeFile(SITEMAP_PATH, sitemap, "utf8");
  const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(/&amp;/g, "&"));
  const publishedLocalized = getPublishedLocalizedRoutes();
  for (const [locale, expected] of Object.entries(EXPECTED_LOCALIZED_ROUTES)) {
    const count = publishedLocalized.filter((route) => route.locale === locale).length;
    if (count !== expected) throw new Error(`Expected ${expected} published ${locale} routes, found ${count}`);
  }
  if (sitemapLocs.length !== EXPECTED_SITEMAP_URLS) throw new Error(`Expected ${EXPECTED_SITEMAP_URLS} sitemap URLs, found ${sitemapLocs.length}`);
  for (const route of publishedLocalized) {
    const file = join(DIST_DIR, route.path.slice(1), "index.html");
    const html = await readFile(file, "utf8");
    if (!html.includes(`<html lang="${route.locale}" dir="ltr"`)) throw new Error(`Localized html attributes missing: ${route.path}`);
    if (!html.includes(`<link rel="canonical" href="${absolute(route.path)}"`)) throw new Error(`Self canonical missing: ${route.path}`);
    if (!html.includes('data-irha-language-selector="static"')) throw new Error(`Static language selector missing: ${route.path}`);
    if (!sitemapLocs.includes(absolute(route.path))) throw new Error(`Published localized route missing from sitemap: ${route.path}`);
    const localizedLinks = [...html.matchAll(/href=["'](\/(?:de|fr|nl)\/?[^"']*)["']/g)].map((match) => normalizeRoutePath(match[1]));
    const unpublishedInternalLink = localizedLinks.find((path) => !isPublishedLocalizedRoute(path));
    if (unpublishedInternalLink) throw new Error(`Published localized route links to unpublished URL ${unpublishedInternalLink}: ${route.path}`);
  }
  const localizedPrefix = new RegExp(`^${SITE_URL}/(?:de|fr|nl)/`);
  const unexpectedLocalized = sitemapLocs.filter((loc) => localizedPrefix.test(loc) && !publishedLocalized.some((route) => absolute(route.path) === loc));
  if (unexpectedLocalized.length > 0) throw new Error(`Unpublished localized sitemap URLs: ${unexpectedLocalized.join(", ")}`);
  console.log(`Internationalization foundation finalized: ${files.length} HTML shells, ${publishedLocalized.length} published localized routes, ${sitemapLocs.length} sitemap URLs`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
