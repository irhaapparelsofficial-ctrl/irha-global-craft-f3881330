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
type ChildLink = { path: string; name: string };
type RouteNames = {
  rootName: string;
  audienceName?: string;
  collectionName?: string;
  productCount: number;
  children: Map<string, string>;
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function upsertRoute(paths: Map<string, RouteNames>, path: string, names: Omit<RouteNames, "productCount" | "children">) {
  const existing = paths.get(path);
  if (existing) return existing;
  const created: RouteNames = { ...names, productCount: 0, children: new Map<string, string>() };
  paths.set(path, created);
  return created;
}

function routeMaps(products: BuyerReadyCatalogRoute[]) {
  const paths = new Map<string, RouteNames>();
  for (const product of products) {
    const rootPath = `/products/${product.main_category_slug}`;
    const audiencePath = `${rootPath}/${product.audience_slug}`;
    const collectionPath = `${audiencePath}/${product.product_type_slug}`;
    const root = upsertRoute(paths, rootPath, { rootName: product.main_category_name });
    const audience = upsertRoute(paths, audiencePath, { rootName: product.main_category_name, audienceName: product.audience_name });
    const collection = upsertRoute(paths, collectionPath, {
      rootName: product.main_category_name,
      audienceName: product.audience_name,
      collectionName: product.product_type_name,
    });
    root.productCount += 1;
    audience.productCount += 1;
    collection.productCount += 1;
    root.children.set(audiencePath, localizedAudienceName("en", product.audience_slug, product.audience_name));
    audience.children.set(collectionPath, localizedCollectionName("en", product.product_type_slug, product.product_type_name));
    collection.children.set(product.canonical_path, product.product_name);
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
  if (segments[2] && names.audienceName) items.push({ name: localizedAudienceName("en", segments[2], names.audienceName), path: `/products/${segments[1]}/${segments[2]}` });
  if (segments[3] && names.collectionName) items.push({ name: localizedCollectionName("en", segments[3], names.collectionName), path: pathname });
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
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: names.children.size,
      itemListElement: [...names.children].map(([path, name], index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
        url: `${SITE}${path}`,
      })),
    },
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

function childSection(names: RouteNames) {
  const links: ChildLink[] = [...names.children].map(([path, name]) => ({ path, name })).sort((a, b) => a.name.localeCompare(b.name));
  return `<section data-irha-taxonomy-children="true" data-irha-product-count="${names.productCount}" aria-labelledby="taxonomy-children" style="max-width:1120px;margin:0 auto;padding:0 24px 52px">
          <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Published catalogue hierarchy</p>
          <h2 id="taxonomy-children" style="margin:0 0 10px;font-size:30px">${names.productCount} published product${names.productCount === 1 ? "" : "s"}</h2>
          <p style="margin:0 0 18px;color:#bdb5aa">Browse the canonical ${links[0]?.path.split("/").length === 6 ? "products" : "child collections"} below.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
            ${links.map((item) => `<a href="${item.path}" style="display:block;border:1px solid #2e2a25;background:#111;color:#f5f1e8;padding:16px;text-decoration:none"><strong>${escapeHtml(item.name)}</strong><br><span style="color:#e8c477;font-size:13px">View canonical page →</span></a>`).join("\n            ")}
          </div>
        </section>`;
}

function replaceRequired(source: string, pattern: RegExp, replacement: string, label: string, pathname: string) {
  if (!pattern.test(source)) throw new Error(`Taxonomy shell ${pathname} is missing ${label}`);
  return source.replace(pattern, replacement);
}

function alignShell(html: string, pathname: string, names: RouteNames) {
  const segments = pathname.split("/").filter(Boolean);
  const topName = localizedTopName("en", segments[1], names.rootName);
  const audienceName = segments[2] && names.audienceName ? localizedAudienceName("en", segments[2], names.audienceName) : undefined;
  const collectionName = segments[3] && names.collectionName ? localizedCollectionName("en", segments[3], names.collectionName) : undefined;
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
  output = output.replace('<footer style="border-top:1px solid #2e2a25', `${childSection(names)}\n        <footer style="border-top:1px solid #2e2a25`);

  for (const required of [
    `<title>${title}</title>`, `>${h1}</h1>`, `href="${SITE}${pathname}"`, '"@type":"CollectionPage"',
    '"@type":"BreadcrumbList"', 'aria-label="Breadcrumb"', 'data-irha-taxonomy-parity="true"',
    `data-irha-product-count="${names.productCount}"`, 'data-irha-taxonomy-children="true"',
  ]) if (!output.includes(required)) throw new Error(`Aligned taxonomy shell ${pathname} is missing ${required}`);
  for (const child of names.children.keys()) if (!output.includes(`href="${child}"`)) throw new Error(`Aligned taxonomy shell ${pathname} is missing child ${child}`);
  return output;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) throw new Error("Taxonomy parity requires the complete 254-product manifest");
  const paths = routeMaps(manifest.products);
  if (paths.size !== EXPECTED_TAXONOMY) throw new Error(`Expected ${EXPECTED_TAXONOMY} published taxonomy paths; received ${paths.size}`);

  for (const [pathname, names] of paths) {
    if (names.productCount < 1 || names.children.size < 1) throw new Error(`Taxonomy route is empty: ${pathname}`);
    const file = join(DIST_DIR, pathname.slice(1), "index.html");
    const html = await readFile(file, "utf8");
    if (html.includes('data-irha-product-shell="true"')) throw new Error(`Taxonomy path resolved to a product shell: ${pathname}`);
    await writeFile(file, alignShell(html, pathname, names), "utf8");
  }
  console.log(`Aligned ${paths.size} non-empty taxonomy shells with runtime SEO, schema, counts and canonical child links`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
