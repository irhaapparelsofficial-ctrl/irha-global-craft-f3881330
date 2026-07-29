import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { SeoRouteEntry } from "./finalize-seo-route-manifest";

const DIST_DIR = resolve("dist");
const SITE_URL = "https://irhaapparels.com";
const MANIFEST_PATH = join(DIST_DIR, "seo-route-manifest.json");
const SITEMAP_PATH = join(DIST_DIR, "sitemap.xml");
const EVIDENCE_DIR = join(DIST_DIR, "seo-evidence");

const RESTRICTED_SCHEMA_TYPES = new Set(["Offer", "AggregateRating", "Review"]);
const RESTRICTED_CLAIM_PATTERN = /\b(certified|certification|award-winning|largest|leading manufacturer|guaranteed lead time|fixed MOQ|in stock|sale price)\b/i;

type ManifestPayload = {
  schemaVersion: number;
  canonicalOrigin: string;
  routeCount: number;
  sitemapCount: number;
  productCount: number;
  blogArticleCount: number;
  routes: SeoRouteEntry[];
};

type Finding = {
  severity: "critical" | "high" | "medium";
  route: string;
  code: string;
  detail: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlText(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function routeHtmlPath(path: string): string {
  return path === "/" ? join(DIST_DIR, "index.html") : join(DIST_DIR, path.slice(1), "index.html");
}

function htmlLang(locale: string): string {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("nl")) return "nl";
  return "en";
}

function stripTags(value: string): string {
  const text = value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlText(text).replace(/\s+/g, " ").trim();
}

function setMeta(html: string, route: SeoRouteEntry): string {
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const canonical = escapeHtml(route.canonicalUrl);
  let output = html
    .replace(/<html\b[^>]*\blang="[^"]*"[^>]*>/i, (tag) => tag.replace(/\blang="[^"]*"/i, `lang="${htmlLang(route.locale)}"`))
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta\b[^>]*\bname="description"[^>]*>/i, `<meta name="description" content="${description}" />`)
    .replace(/<link\b[^>]*\brel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta\b[^>]*\bproperty="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta\b[^>]*\bproperty="og:description"[^>]*>/i, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta\b[^>]*\bproperty="og:url"[^>]*>/i, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta\b[^>]*\bname="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta\b[^>]*\bname="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${description}" />`);

  if (!/<meta\b[^>]*\bname="description"/i.test(output)) output = output.replace("</head>", `  <meta name="description" content="${description}" />\n</head>`);
  if (!/<link\b[^>]*\brel="canonical"/i.test(output)) output = output.replace("</head>", `  <link rel="canonical" href="${canonical}" />\n</head>`);
  if (!/<meta\b[^>]*\bproperty="og:url"/i.test(output)) output = output.replace("</head>", `  <meta property="og:url" content="${canonical}" />\n</head>`);

  output = output.replace(/\s*<link\b[^>]*\brel="alternate"[^>]*\bhreflang="[^"]+"[^>]*>/gi, "");
  const alternateLinks = [
    ...route.alternates.map((alternate) => `<link data-irha-authoritative-hreflang="true" rel="alternate" hreflang="${escapeHtml(alternate.hreflang)}" href="${escapeHtml(alternate.url)}" />`),
    ...(route.xDefault ? [`<link data-irha-authoritative-hreflang="true" rel="alternate" hreflang="x-default" href="${escapeHtml(route.xDefault)}" />`] : []),
  ];
  if (alternateLinks.length) output = output.replace("</head>", `  ${alternateLinks.join("\n  ")}\n</head>`);
  return output;
}

function breadcrumbSchema(route: SeoRouteEntry, routeByPath: Map<string, SeoRouteEntry>) {
  const paths = [...route.breadcrumbPaths, route.path].filter((value, index, array) => array.indexOf(value) === index);
  return {
    "@type": "BreadcrumbList",
    itemListElement: paths.map((path, index) => {
      const target = routeByPath.get(path);
      return {
        "@type": "ListItem",
        position: index + 1,
        name: path === "/" ? "Irha Apparels" : target?.h1 || path.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") || "Page",
        item: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
      };
    }),
  };
}

function authoritativeSchema(route: SeoRouteEntry, routeByPath: Map<string, SeoRouteEntry>) {
  const base = {
    "@context": "https://schema.org",
    "@graph": [] as Record<string, unknown>[],
  };

  if (route.routeType === "homepage") {
    base["@graph"].push(
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Irha Apparels",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/irha-brand-mark.svg`,
        email: "irhaapparelsofficial@gmail.com",
        telephone: "+92 320 4110066",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Sialkot",
          addressRegion: "Punjab",
          addressCountry: "PK",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "Irha Apparels",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: htmlLang(route.locale),
      },
    );
  } else if (route.routeType === "resource-article") {
    base["@graph"].push({
      "@type": "Article",
      "@id": `${route.canonicalUrl}#article`,
      url: route.canonicalUrl,
      mainEntityOfPage: route.canonicalUrl,
      headline: route.h1,
      description: route.description,
      image: route.image || `${SITE_URL}/og-image.jpg`,
      dateModified: route.lastmod || undefined,
      author: { "@type": "Organization", name: "Irha Apparels Editorial Review", url: `${SITE_URL}/` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: htmlLang(route.locale),
    }, breadcrumbSchema(route, routeByPath));
  } else if (route.routeType === "individual-product") {
    return null;
  } else {
    const pageType = ["main-division", "audience-group", "product-type", "resource-index"].includes(route.routeType) ? "CollectionPage" : "WebPage";
    base["@graph"].push({
      "@type": pageType,
      "@id": `${route.canonicalUrl}#webpage`,
      url: route.canonicalUrl,
      name: route.title,
      description: route.description,
      inLanguage: htmlLang(route.locale),
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
    }, breadcrumbSchema(route, routeByPath));
  }
  return base;
}

function removeRestrictedJsonLd(html: string): string {
  return html.replace(/\s*<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    try {
      const jsonText = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>[\s\S]*$/i, "");
      const data = JSON.parse(jsonText) as unknown;
      const stack: unknown[] = [data];
      while (stack.length) {
        const current = stack.pop();
        if (Array.isArray(current)) stack.push(...current);
        else if (current && typeof current === "object") {
          const record = current as Record<string, unknown>;
          const type = record["@type"];
          if (typeof type === "string" && RESTRICTED_SCHEMA_TYPES.has(type)) return "";
          if (Array.isArray(type) && type.some((value) => typeof value === "string" && RESTRICTED_SCHEMA_TYPES.has(value))) return "";
          stack.push(...Object.values(record));
        }
      }
      return block;
    } catch {
      return block;
    }
  });
}

function setAuthoritativeSchema(html: string, route: SeoRouteEntry, routeByPath: Map<string, SeoRouteEntry>): string {
  let output = html.replace(/\s*<script\b[^>]*data-irha-authoritative-seo="true"[^>]*>[\s\S]*?<\/script>/gi, "");
  output = removeRestrictedJsonLd(output);
  const schema = authoritativeSchema(route, routeByPath);
  if (!schema) return output;
  const script = `<script data-irha-authoritative-seo="true" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`;
  return output.replace("</head>", `  ${script}\n</head>`);
}

function articleShell(route: SeoRouteEntry): string {
  const paragraphs = (route.bodyText || route.description)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => index === 0 ? `<p style="font-size:18px;color:#d7d0c4">${escapeHtml(paragraph)}</p>` : `<p style="color:#d7d0c4">${escapeHtml(paragraph)}</p>`)
    .join("\n");
  return `<main id="irha-static-crawler-shell" data-irha-route-shell="${escapeHtml(route.path)}" data-irha-resource-article="true" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;padding:48px 24px;font-family:Arial,sans-serif;line-height:1.65">
    <article style="max-width:860px;margin:0 auto">
      <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">Irha Apparels · B2B Manufacturing Guide</p>
      <h1 style="margin:0 0 24px;font-size:clamp(34px,7vw,64px);line-height:1.08">${escapeHtml(route.h1)}</h1>
      ${paragraphs}
      <nav aria-label="Buyer guide links" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:36px">
        <a href="/resources" style="color:#e8c477">Manufacturing guides</a>
        <a href="/products" style="color:#e8c477">Product categories</a>
        <a href="/materials" style="color:#e8c477">Materials</a>
        <a href="/buyer-information" style="color:#e8c477">Buyer information</a>
        <a href="/inquiry" style="color:#e8c477">Request a quote</a>
      </nav>
    </article>
  </main>`;
}

function setVisibleIdentity(html: string, route: SeoRouteEntry): string {
  let output = html;
  if (route.routeType === "resource-article") {
    const shell = articleShell(route);
    if (/<main\b[^>]*id="irha-static-crawler-shell"[\s\S]*?<\/main>/i.test(output)) {
      output = output.replace(/<main\b[^>]*id="irha-static-crawler-shell"[\s\S]*?<\/main>/i, shell);
    } else {
      output = output.replace(/<div\b[^>]*id="root"[^>]*>/i, `$&${shell}`);
    }
    return output;
  }

  const h1Match = output.match(/<h1\b([^>]*)>[\s\S]*?<\/h1>/i);
  if (h1Match && stripTags(h1Match[0]) !== route.h1) {
    output = output.replace(h1Match[0], `<h1${h1Match[1]}>${escapeHtml(route.h1)}</h1>`);
  }
  return output;
}

function extractSitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtmlText(match[1]));
}

function extractJsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]) as unknown;
      const stack: unknown[] = [data];
      while (stack.length) {
        const current = stack.pop();
        if (Array.isArray(current)) stack.push(...current);
        else if (current && typeof current === "object") {
          const record = current as Record<string, unknown>;
          const type = record["@type"];
          if (typeof type === "string") types.add(type);
          if (Array.isArray(type)) for (const value of type) if (typeof value === "string") types.add(value);
          stack.push(...Object.values(record));
        }
      }
    } catch {
      types.add("INVALID_JSON_LD");
    }
  }
  return [...types].sort();
}

function verifyRoute(route: SeoRouteEntry, html: string, findings: Finding[]) {
  const expectedLang = htmlLang(route.locale);
  const title = decodeHtmlText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const canonical = decodeHtmlText(html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/i)?.[1] || "");
  const language = html.match(/<html\b[^>]*lang="([^"]+)"/i)?.[1];
  const h1 = stripTags(html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || "");
  const robots = html.match(/<meta\b[^>]*name="robots"[^>]*content="([^"]+)"[^>]*>/i)?.[1] || "";
  const types = extractJsonLdTypes(html);
  const alternates = new Map([...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"[^>]*>/gi)].map((match) => [match[1], decodeHtmlText(match[2])]));

  if (title !== route.title) findings.push({ severity: "critical", route: route.path, code: "TITLE_MISMATCH", detail: `${title || "missing"} !== ${route.title}` });
  if (canonical !== route.canonicalUrl) findings.push({ severity: "critical", route: route.path, code: "CANONICAL_MISMATCH", detail: `${canonical || "missing"} !== ${route.canonicalUrl}` });
  if (language !== expectedLang) findings.push({ severity: "critical", route: route.path, code: "HTML_LANG_MISMATCH", detail: `${language || "missing"} !== ${expectedLang}` });
  if (h1 !== route.h1) findings.push({ severity: "high", route: route.path, code: "H1_MISMATCH", detail: `${h1 || "missing"} !== ${route.h1}` });
  if (/noindex/i.test(robots)) findings.push({ severity: "critical", route: route.path, code: "INDEXABLE_ROUTE_NOINDEX", detail: robots });
  if (types.includes("INVALID_JSON_LD")) findings.push({ severity: "high", route: route.path, code: "INVALID_JSON_LD", detail: "At least one JSON-LD block is invalid" });
  for (const restricted of RESTRICTED_SCHEMA_TYPES) if (types.includes(restricted)) findings.push({ severity: "critical", route: route.path, code: "RESTRICTED_SCHEMA", detail: restricted });
  for (const alternate of route.alternates) if (alternates.get(alternate.hreflang) !== alternate.url) findings.push({ severity: "critical", route: route.path, code: "HREFLANG_MISMATCH", detail: `${alternate.hreflang} -> ${alternates.get(alternate.hreflang) || "missing"}` });
  if (route.xDefault && alternates.get("x-default") !== route.xDefault) findings.push({ severity: "critical", route: route.path, code: "XDEFAULT_MISMATCH", detail: alternates.get("x-default") || "missing" });
  if (route.routeType === "resource-article" && !html.includes('data-irha-resource-article="true"')) findings.push({ severity: "high", route: route.path, code: "ARTICLE_STATIC_BODY_MISSING", detail: "Article body was not embedded in raw HTML" });
  if (route.routeType === "individual-product" && (types.includes("Offer") || types.includes("AggregateRating") || types.includes("Review"))) findings.push({ severity: "critical", route: route.path, code: "PRODUCT_SCHEMA_OVERCLAIM", detail: types.join(", ") });
  if (RESTRICTED_CLAIM_PATTERN.test(stripTags(html)) && route.routeType === "resource-article") findings.push({ severity: "high", route: route.path, code: "UNSUPPORTED_ARTICLE_CLAIM", detail: "Restricted claim wording detected" });
}

function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as ManifestPayload;
  if (manifest.schemaVersion !== 1 || manifest.canonicalOrigin !== SITE_URL || manifest.routeCount !== manifest.routes.length) {
    throw new Error("Authoritative SEO manifest is invalid");
  }
  const routeByPath = new Map(manifest.routes.map((route) => [route.path, route]));
  const findings: Finding[] = [];

  for (const route of manifest.routes.filter((candidate) => candidate.indexable && candidate.sitemap)) {
    const path = routeHtmlPath(route.path);
    let html: string;
    try {
      html = readFileSync(path, "utf8");
    } catch {
      findings.push({ severity: "critical", route: route.path, code: "STATIC_SHELL_MISSING", detail: path });
      continue;
    }
    html = setMeta(html, route);
    html = setVisibleIdentity(html, route);
    html = setAuthoritativeSchema(html, route, routeByPath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, html);
    verifyRoute(route, html, findings);
  }

  const sitemap = readFileSync(SITEMAP_PATH, "utf8");
  const sitemapUrls = extractSitemapUrls(sitemap);
  const expectedUrls = manifest.routes.filter((route) => route.indexable && route.sitemap).map((route) => route.canonicalUrl);
  const sitemapSet = new Set(sitemapUrls);
  const expectedSet = new Set(expectedUrls);
  for (const url of expectedUrls) if (!sitemapSet.has(url)) findings.push({ severity: "critical", route: new URL(url).pathname, code: "SITEMAP_ROUTE_MISSING", detail: url });
  for (const url of sitemapUrls) if (!expectedSet.has(url)) findings.push({ severity: "critical", route: new URL(url).pathname, code: "SITEMAP_EXTRA_ROUTE", detail: url });
  if (sitemapUrls.length !== sitemapSet.size) findings.push({ severity: "critical", route: "/sitemap.xml", code: "SITEMAP_DUPLICATE", detail: `${sitemapUrls.length - sitemapSet.size} duplicate URLs` });

  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  for (const route of manifest.routes.filter((candidate) => candidate.indexable && candidate.sitemap)) {
    const titleKey = `${htmlLang(route.locale)}:${route.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
    const descriptionKey = `${htmlLang(route.locale)}:${route.description.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (titles.has(titleKey)) findings.push({ severity: "high", route: route.path, code: "DUPLICATE_TITLE", detail: titles.get(titleKey)! });
    if (descriptions.has(descriptionKey)) findings.push({ severity: "high", route: route.path, code: "DUPLICATE_DESCRIPTION", detail: descriptions.get(descriptionKey)! });
    titles.set(titleKey, route.path);
    descriptions.set(descriptionKey, route.path);
    if (route.parentPath && !routeByPath.has(route.parentPath)) findings.push({ severity: "high", route: route.path, code: "ORPHAN_PARENT", detail: route.parentPath });
  }

  const critical = findings.filter((finding) => finding.severity === "critical").length;
  const high = findings.filter((finding) => finding.severity === "high").length;
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    canonicalOrigin: SITE_URL,
    routeCount: manifest.routeCount,
    sitemapCount: sitemapUrls.length,
    productCount: manifest.productCount,
    blogArticleCount: manifest.blogArticleCount,
    shellCount: manifest.routes.filter((route) => route.indexable && route.sitemap).length,
    canonicalErrors: findings.filter((finding) => finding.code.includes("CANONICAL")).length,
    hreflangErrors: findings.filter((finding) => finding.code.includes("HREFLANG") || finding.code.includes("XDEFAULT")).length,
    languageErrors: findings.filter((finding) => finding.code.includes("LANG")).length,
    duplicateTitleErrors: findings.filter((finding) => finding.code === "DUPLICATE_TITLE").length,
    duplicateDescriptionErrors: findings.filter((finding) => finding.code === "DUPLICATE_DESCRIPTION").length,
    orphanErrors: findings.filter((finding) => finding.code === "ORPHAN_PARENT").length,
    invalidJsonLdErrors: findings.filter((finding) => finding.code === "INVALID_JSON_LD").length,
    restrictedSchemaErrors: findings.filter((finding) => finding.code === "RESTRICTED_SCHEMA" || finding.code === "PRODUCT_SCHEMA_OVERCLAIM").length,
    findings: { critical, high, medium: findings.filter((finding) => finding.severity === "medium").length },
    findingDetails: findings,
  };
  writeFileSync(join(EVIDENCE_DIR, "build-seo-acceptance.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(join(EVIDENCE_DIR, "build-seo-acceptance.md"), [
    "# IA-SEO-MASTER-FINAL Build Acceptance",
    "",
    `- Routes: ${evidence.routeCount}`,
    `- Sitemap URLs: ${evidence.sitemapCount}`,
    `- Product routes: ${evidence.productCount}`,
    `- Resource articles: ${evidence.blogArticleCount}`,
    `- Critical findings: ${critical}`,
    `- High findings: ${high}`,
    "",
    ...findings.map((finding) => `- ${finding.severity.toUpperCase()} ${finding.code} ${finding.route}: ${finding.detail}`),
    "",
  ].join("\n"));

  console.log(JSON.stringify(evidence, null, 2));
  if (critical || high) throw new Error(`Authoritative SEO build acceptance failed: ${critical} critical, ${high} high`);
}

main();
