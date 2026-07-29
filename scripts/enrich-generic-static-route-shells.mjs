import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CORE_ROUTE_CONTENT, CORE_ROUTE_PATHS } from "../src/lib/routeContent.mjs";
import { PUBLIC_IDENTITY } from "../src/lib/publicIdentity.mjs";

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const SITE_URL = "https://irhaapparels.com";
const MANIFEST_PATH = join(DIST_DIR, "catalog-route-manifest.json");
const SEO_MANIFEST_PATH = join(DIST_DIR, "seo-route-manifest.json");
const SITEMAP_PATH = join(DIST_DIR, "sitemap.xml");
const GENERIC_ROUTE_SHELL = /<main id="irha-static-crawler-shell" data-irha-route-shell="([^"]+)"[\s\S]*?<\/main>/i;
const PRODUCT_SHELL = 'data-irha-product-shell="true"';
const EXPECTED_PRODUCT_SHELLS = 254;
const EXPECTED_TAXONOMY_SHELLS = 105;
const EXPECTED_CORE_SHELLS = CORE_ROUTE_PATHS.length;
const SPECIALIZED_PATHS = new Set([
  "/de",
  "/fr",
  "/nl",
  "/de/bavarian-wear",
  "/blog",
]);
const SPECIALIZED_PREFIXES = ["/markets/", "/blog/"];
const UNIVERSAL_FINGERPRINTS = [
  "Five specialist apparel categories.",
  "From requirement to shipping review.",
  "Experienced manufacturer. Newly built website.",
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanPath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function absoluteUrl(pathname) {
  return pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname}`;
}

function isSpecialized(pathname) {
  return pathname === "/markets"
    || SPECIALIZED_PATHS.has(pathname)
    || SPECIALIZED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function taxonomyPaths(products) {
  const paths = new Set();
  for (const product of products) {
    const root = `/products/${product.main_category_slug}`;
    const audience = `${root}/${product.audience_slug}`;
    paths.add(root);
    paths.add(audience);
    paths.add(`${audience}/${product.product_type_slug}`);
  }
  return paths;
}

function breadcrumbHtml(items) {
  return items.map((item, index) => {
    const label = escapeHtml(item.label);
    return index === items.length - 1
      ? `<span aria-current="page" style="color:#aaa29a">${label}</span>`
      : `<a href="${escapeHtml(item.href)}" style="color:#e8c477;text-decoration:none">${label}</a>`;
  }).join('<span aria-hidden="true" style="color:#5f584e">/</span>');
}

function linkAttributes(href) {
  return /^https?:\/\//.test(href) ? ' target="_blank" rel="noreferrer noopener"' : "";
}

function linksHtml(links) {
  if (!links?.length) return "";
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:18px">
    ${links.map((link) => `<a href="${escapeHtml(link.href)}"${linkAttributes(link.href)} style="display:block;border:1px solid #2e2a25;background:#111;color:#e8c477;padding:14px;text-decoration:none">${escapeHtml(link.label)} →</a>`).join("\n    ")}
  </div>`;
}

function sectionsHtml(sections) {
  return sections.map((section, index) => `<section aria-labelledby="core-section-${index + 1}" style="margin-top:38px;border-top:1px solid #2e2a25;padding-top:28px">
    <h2 id="core-section-${index + 1}" style="font-size:clamp(25px,4vw,34px);line-height:1.18;margin:0 0 12px">${escapeHtml(section.heading)}</h2>
    <p style="max-width:840px;margin:0;color:#c8c0b5">${escapeHtml(section.body)}</p>
    ${section.items?.length ? `<ul style="max-width:840px;margin:18px 0 0;padding-left:22px;color:#d7d0c4">${section.items.map((item) => `<li style="margin:8px 0">${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${linksHtml(section.links)}
  </section>`).join("\n");
}

function coreShell(content) {
  return `<main id="irha-static-crawler-shell" data-irha-route-shell="${escapeHtml(content.route)}" data-irha-route-content="core" data-irha-page-type="${escapeHtml(content.pageType)}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;line-height:1.65">
    <header style="border-bottom:1px solid #2e2a25;background:#0a0a0a">
      <div style="max-width:1120px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
        <a href="/" aria-label="Irha Apparels home" style="color:#e8c477;text-decoration:none;font-weight:700;letter-spacing:.18em;font-size:14px">IRHA APPARELS</a>
        <nav aria-label="Primary navigation" style="display:flex;flex-wrap:wrap;gap:16px;font-size:13px">
          <a href="/products" style="color:#f5f1e8;text-decoration:none">Products</a>
          <a href="/manufacturing" style="color:#f5f1e8;text-decoration:none">Manufacturing</a>
          <a href="/buyer-trust" style="color:#f5f1e8;text-decoration:none">Buyer Trust</a>
          <a href="/contact" style="color:#f5f1e8;text-decoration:none">Contact</a>
        </nav>
      </div>
    </header>
    <div style="max-width:1120px;margin:0 auto;padding:34px 24px 64px">
      <nav aria-label="Breadcrumb" style="display:flex;flex-wrap:wrap;gap:9px;font-size:12px;margin-bottom:28px">${breadcrumbHtml(content.breadcrumbs)}</nav>
      <section aria-labelledby="route-heading" style="max-width:900px">
        <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">${escapeHtml(content.eyebrow)}</p>
        <h1 id="route-heading" style="margin:0 0 20px;font-family:Georgia,serif;font-size:clamp(36px,7vw,68px);line-height:1.08;font-weight:500">${escapeHtml(content.h1)}</h1>
        <p data-irha-primary-introduction="true" style="max-width:840px;font-size:18px;color:#d7d0c4">${escapeHtml(content.intro)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:26px">
          <a href="${escapeHtml(content.primaryCta.href)}"${linkAttributes(content.primaryCta.href)} style="display:inline-block;background:#d1ad5a;color:#090909;padding:13px 18px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(content.primaryCta.label)}</a>
          ${content.secondaryCta ? `<a href="${escapeHtml(content.secondaryCta.href)}"${linkAttributes(content.secondaryCta.href)} style="display:inline-block;border:1px solid #645943;color:#e8c477;padding:12px 18px;text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(content.secondaryCta.label)}</a>` : ""}
        </div>
      </section>
      ${sectionsHtml(content.sections)}
    </div>
    <footer style="border-top:1px solid #2e2a25;background:#080808">
      <div style="max-width:1120px;margin:0 auto;padding:26px 24px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;color:#aaa29a;font-size:13px">
        <span>${escapeHtml(PUBLIC_IDENTITY.name)} · ${escapeHtml(PUBLIC_IDENTITY.address.display)}</span>
        <span><a href="mailto:${escapeHtml(PUBLIC_IDENTITY.email)}" style="color:#e8c477">${escapeHtml(PUBLIC_IDENTITY.email)}</a> · <a href="tel:${escapeHtml(PUBLIC_IDENTITY.telephoneHref)}" style="color:#e8c477">${escapeHtml(PUBLIC_IDENTITY.telephone)}</a></span>
      </div>
    </footer>
  </main>`;
}

function routeSchemas(content) {
  const canonical = absoluteUrl(content.route);
  const webPage = {
    "@context": "https://schema.org",
    "@type": content.pageType,
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: content.title,
    description: content.metaDescription,
    isPartOf: { "@id": PUBLIC_IDENTITY.websiteId },
    about: { "@id": PUBLIC_IDENTITY.organizationId },
    inLanguage: "en",
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: content.breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };
  return [webPage, breadcrumb]
    .map((value) => `<script data-irha-route-jsonld="true" type="application/ld+json">${JSON.stringify(value).replace(/</g, "\\u003c")}</script>`)
    .join("\n    ");
}

function replaceRequired(source, pattern, replacement, label, pathname) {
  if (!pattern.test(source)) throw new Error(`Core route ${pathname} is missing ${label}`);
  return source.replace(pattern, replacement);
}

function renderCoreRoute(html, content) {
  const title = escapeHtml(content.title);
  const description = escapeHtml(content.metaDescription);
  const canonical = absoluteUrl(content.route);
  let output = html;
  output = replaceRequired(output, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`, "title", content.route);
  output = replaceRequired(output, /<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${description}" />`, "description", content.route);
  output = replaceRequired(output, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`, "canonical", content.route);
  output = output.replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${title}" />`);
  output = output.replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${description}" />`);
  output = output.replace(/<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${canonical}" />`);
  output = output.replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${title}" />`);
  output = output.replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${description}" />`);
  output = output.replace(/\s*<script data-irha-route-jsonld="true"[\s\S]*?<\/script>/gi, "");
  output = output.replace(GENERIC_ROUTE_SHELL, coreShell(content));
  output = output.replace("</head>", `    ${routeSchemas(content)}\n  </head>`);
  return output;
}

function sitemapPaths(xml) {
  const paths = new Set();
  for (const block of xml.matchAll(/<url>[\s\S]*?<\/url>/g)) {
    const match = block[0].match(/<loc>([^<]+)<\/loc>/);
    if (!match) continue;
    const url = new URL(match[1].replace(/&amp;/g, "&"));
    if (url.origin === SITE_URL) paths.add(cleanPath(url.pathname));
  }
  return paths;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (manifest.schemaVersion !== 1 || manifest.productCount !== EXPECTED_PRODUCT_SHELLS || manifest.products.length !== EXPECTED_PRODUCT_SHELLS) {
    throw new Error("Route-specific enrichment requires the complete 254-product manifest");
  }
  const taxonomy = taxonomyPaths(manifest.products);
  if (taxonomy.size !== EXPECTED_TAXONOMY_SHELLS) throw new Error(`Expected ${EXPECTED_TAXONOMY_SHELLS} taxonomy routes; found ${taxonomy.size}`);

  const seoManifest = JSON.parse(await readFile(SEO_MANIFEST_PATH, "utf8"));
  if (seoManifest.schemaVersion !== 1 || !Array.isArray(seoManifest.routes)) {
    throw new Error("Authoritative SEO route manifest is missing or invalid");
  }
  const expectedCanonicalPaths = new Set(
    seoManifest.routes
      .filter((route) => route.indexable && route.sitemap)
      .map((route) => cleanPath(route.path)),
  );
  if (expectedCanonicalPaths.size !== seoManifest.sitemapCount) {
    throw new Error(`Authoritative SEO manifest count mismatch: expected ${seoManifest.sitemapCount}, derived ${expectedCanonicalPaths.size}`);
  }

  const canonicalPaths = sitemapPaths(await readFile(SITEMAP_PATH, "utf8"));
  if (canonicalPaths.size !== expectedCanonicalPaths.size) {
    throw new Error(`SEO manifest/sitemap route count mismatch: manifest ${expectedCanonicalPaths.size}, sitemap ${canonicalPaths.size}`);
  }
  for (const pathname of expectedCanonicalPaths) {
    if (!canonicalPaths.has(pathname)) throw new Error(`Sitemap is missing authoritative route: ${pathname}`);
  }
  for (const pathname of canonicalPaths) {
    if (!expectedCanonicalPaths.has(pathname)) throw new Error(`Sitemap contains non-authoritative route: ${pathname}`);
  }

  let coreShellsRendered = 0;
  let taxonomyShellsDeferred = 0;
  let productShellsPreserved = 0;
  let specializedShellsPreserved = 0;

  for (const pathname of canonicalPaths) {
    if (pathname === "/") continue;
    const file = join(DIST_DIR, pathname.slice(1), "index.html");
    const html = await readFile(file, "utf8");
    const match = html.match(GENERIC_ROUTE_SHELL);

    if (html.includes(PRODUCT_SHELL)) {
      const original = match?.[0] ?? html;
      if (original.includes(PRODUCT_SHELL)) productShellsPreserved += 1;
      continue;
    }
    if (taxonomy.has(pathname)) {
      if (!match) throw new Error(`Taxonomy route is missing its base static shell before alignment: ${pathname}`);
      taxonomyShellsDeferred += 1;
      continue;
    }
    if (isSpecialized(pathname) || html.includes('data-irha-static-buyer-shell="true"')) {
      specializedShellsPreserved += 1;
      continue;
    }

    const content = CORE_ROUTE_CONTENT[pathname];
    if (!content) {
      if (match) throw new Error(`Canonical route has no approved route-content source: ${pathname}`);
      continue;
    }
    if (!match) throw new Error(`Core canonical route is missing its base static shell: ${pathname}`);
    const original = match[0];
    if (original.includes(PRODUCT_SHELL)) throw new Error(`Core route unexpectedly resolved to a product shell: ${pathname}`);
    const output = renderCoreRoute(html, content);
    for (const token of [
      `data-irha-route-content="core"`,
      `<title>${escapeHtml(content.title)}</title>`,
      `<link rel="canonical" href="${absoluteUrl(pathname)}"`,
      `<h1 id="route-heading"`,
      escapeHtml(content.h1),
      escapeHtml(content.intro),
      '"@type":"BreadcrumbList"',
    ]) if (!output.includes(token)) throw new Error(`Rendered core route ${pathname} is missing: ${token}`);
    for (const fingerprint of UNIVERSAL_FINGERPRINTS) if (output.includes(fingerprint)) throw new Error(`Core route ${pathname} retained the universal manufacturer shell: ${fingerprint}`);
    await writeFile(file, output, "utf8");
    coreShellsRendered += 1;
  }

  if (productShellsPreserved !== EXPECTED_PRODUCT_SHELLS) {
    throw new Error(`Expected ${EXPECTED_PRODUCT_SHELLS} product shells to remain product-specific; found ${productShellsPreserved}`);
  }
  if (taxonomyShellsDeferred !== EXPECTED_TAXONOMY_SHELLS) {
    throw new Error(`Expected ${EXPECTED_TAXONOMY_SHELLS} taxonomy shells to be deferred; found ${taxonomyShellsDeferred}`);
  }
  if (coreShellsRendered !== EXPECTED_CORE_SHELLS) {
    throw new Error(`Expected ${EXPECTED_CORE_SHELLS} core route shells; rendered ${coreShellsRendered}`);
  }
  console.log(`Rendered ${coreShellsRendered} route-specific core shells, deferred ${taxonomyShellsDeferred} taxonomy shells, preserved ${productShellsPreserved} product shells and preserved ${specializedShellsPreserved} specialized shells from ${canonicalPaths.size} authoritative sitemap routes`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
