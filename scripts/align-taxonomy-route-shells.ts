import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
import {
  localizedAudienceName,
  localizedCollectionName,
  localizedTaxonomySeo,
  localizedTopName,
} from "../src/lib/taxonomyI18n";

const DIST_DIR = resolve("dist");
const MANIFEST_PATH = join(DIST_DIR, "catalog-route-manifest.json");
const SITE = "https://irhaapparels.com";
const EXPECTED_TAXONOMY = 105;

type Manifest = { schemaVersion: number; productCount: number; products: BuyerReadyCatalogRoute[] };
type RouteNames = { rootName: string; audienceName?: string; collectionName?: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function routeMaps(products: BuyerReadyCatalogRoute[]) {
  const paths = new Map<string, RouteNames>();
  for (const product of products) {
    const root = `/products/${product.main_category_slug}`;
    const audience = `${root}/${product.audience_slug}`;
    const collection = `${audience}/${product.product_type_slug}`;
    paths.set(root, { rootName: product.main_category_name });
    paths.set(audience, { rootName: product.main_category_name, audienceName: product.audience_name });
    paths.set(collection, {
      rootName: product.main_category_name,
      audienceName: product.audience_name,
      collectionName: product.product_type_name,
    });
  }
  return paths;
}

function breadcrumbItems(pathname: string, names: RouteNames) {
  const segments = pathname.split("/").filter(Boolean);
  const items = [
    { name: "Home", path: "/" },
    { name: "Collections", path: "/products" },
    { name: localizedTopName("en", segments[1], names.rootName), path: `/products/${segments[1]}` },
  ];
  if (segments[2] && names.audienceName) {
    items.push({
      name: localizedAudienceName("en", segments[2], names.audienceName),
      path: `/products/${segments[1]}/${segments[2]}`,
    });
  }
  if (segments[3] && names.collectionName) {
    items.push({
      name: localizedCollectionName("en", segments[3], names.collectionName),
      path: pathname,
    });
  }
  return items;
}

function routeSchemas(pathname: string, title: string, description: string, names: RouteNames) {
  const canonical = `${SITE}${pathname}`;
  const crumbs = breadcrumbItems(pathname, names);
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    url: canonical,
    name: title,
    description,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE}/#website` },
    about: { "@type": "Thing", name: crumbs.at(-1)?.name },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE}${item.path === "/" ? "/" : item.path}`,
    })),
  };
  return [collection, breadcrumb]
    .map((value) => `<script data-irha-route-jsonld="true" type="application/ld+json">${JSON.stringify(value).replace(/</g, "\\u003c")}</script>`)
    .join("\n    ");
}

function replaceRequired(source: string, pattern: RegExp, replacement: string, label: string, pathname: string) {
  if (!pattern.test(source)) throw new Error(`Taxonomy shell ${pathname} is missing ${label}`);
  return source.replace(pattern, replacement);
}

function alignShell(html: string, pathname: string, names: RouteNames) {
  const segments = pathname.split("/").filter(Boolean);
  const topName = localizedTopName("en", segments[1], names.rootName);
  const audienceName = segments[2] && names.audienceName
    ? localizedAudienceName("en", segments[2], names.audienceName)
    : undefined;
  const collectionName = segments[3] && names.collectionName
    ? localizedCollectionName("en", segments[3], names.collectionName)
    : undefined;
  const seo = localizedTaxonomySeo({ locale: "en", topName, audienceName, collectionName });
  const title = escapeHtml(seo.title);
  const h1 = escapeHtml(seo.h1);
  const description = escapeHtml(seo.description);
  const intro = escapeHtml(seo.intro);

  let output = html;
  output = replaceRequired(output, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`, "title", pathname);
  output = replaceRequired(output, /<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${description}" />`, "description", pathname);
  output = replaceRequired(output, /<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${title}" />`, "Open Graph title", pathname);
  output = replaceRequired(output, /<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${description}" />`, "Open Graph description", pathname);
  output = replaceRequired(output, /<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${title}" />`, "Twitter title", pathname);
  output = replaceRequired(output, /<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${description}" />`, "Twitter description", pathname);
  output = replaceRequired(output, /<h1([^>]*)>[\s\S]*?<\/h1>/i, `<h1$1>${h1}</h1>`, "H1", pathname);
  output = replaceRequired(output, /<p style="max-width:820px;font-size:18px;color:#d7d0c4">[\s\S]*?<\/p>/i, `<p style="max-width:820px;font-size:18px;color:#d7d0c4">${intro}</p>`, "buyer introduction", pathname);
  output = output.replace(/\s*<script data-irha-route-jsonld="true"[\s\S]*?<\/script>/gi, "");
  output = output.replace("</head>", `    ${routeSchemas(pathname, seo.h1, seo.description, names)}\n  </head>`);
  output = output.replace('data-irha-rich-route-shell="true"', 'data-irha-rich-route-shell="true" data-irha-taxonomy-parity="true"');

  for (const required of [
    `<title>${title}</title>`,
    `>${h1}</h1>`,
    `href="${SITE}${pathname}"`,
    '"@type":"CollectionPage"',
    '"@type":"BreadcrumbList"',
    'aria-label="Breadcrumb"',
    'data-irha-taxonomy-parity="true"',
  ]) {
    if (!output.includes(required)) throw new Error(`Aligned taxonomy shell ${pathname} is missing ${required}`);
  }
  return output;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) {
    throw new Error("Taxonomy parity requires the complete 254-product manifest");
  }
  const paths = routeMaps(manifest.products);
  if (paths.size !== EXPECTED_TAXONOMY) {
    throw new Error(`Expected ${EXPECTED_TAXONOMY} published taxonomy paths; received ${paths.size}`);
  }

  for (const [pathname, names] of paths) {
    const file = join(DIST_DIR, pathname.slice(1), "index.html");
    const html = await readFile(file, "utf8");
    if (html.includes('data-irha-product-shell="true"')) throw new Error(`Taxonomy path resolved to a product shell: ${pathname}`);
    await writeFile(file, alignShell(html, pathname, names), "utf8");
  }
  console.log(`Aligned ${paths.size} taxonomy shells with runtime SEO, CollectionPage and BreadcrumbList schema`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
