import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
import {
  localizedAudienceName,
  localizedCollectionName,
  localizedTaxonomySeo,
  localizedTopName,
  taxonomyUi,
} from "../src/lib/taxonomyI18n";

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const MANIFEST_PATH = join(DIST_DIR, "catalog-route-manifest.json");
const SITE = "https://irhaapparels.com";
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;
const ROUTE_SHELL = /<main id="irha-static-crawler-shell"[^>]*>[\s\S]*?<\/main>/i;

type Manifest = { schemaVersion: number; productCount: number; products: BuyerReadyCatalogRoute[] };
type RouteKind = "root" | "audience" | "collection";
type ChildLink = { path: string; name: string; kind: "audience" | "collection" | "product" };
type RouteNode = {
  kind: RouteKind;
  rootName: string;
  audienceName?: string;
  collectionName?: string;
  productCount: number;
  children: Map<string, ChildLink>;
  products: BuyerReadyCatalogRoute[];
  collectionNames: Map<string, string>;
  audienceNames: Map<string, string>;
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function upsert(routes: Map<string, RouteNode>, path: string, data: Pick<RouteNode, "kind" | "rootName" | "audienceName" | "collectionName">) {
  const existing = routes.get(path);
  if (existing) return existing;
  const node: RouteNode = {
    ...data,
    productCount: 0,
    children: new Map<string, ChildLink>(),
    products: [],
    collectionNames: new Map<string, string>(),
    audienceNames: new Map<string, string>(),
  };
  routes.set(path, node);
  return node;
}

function routeMap(products: BuyerReadyCatalogRoute[]) {
  const routes = new Map<string, RouteNode>();
  for (const product of products) {
    const rootPath = `/products/${product.main_category_slug}`;
    const audiencePath = `${rootPath}/${product.audience_slug}`;
    const collectionPath = `${audiencePath}/${product.product_type_slug}`;
    const root = upsert(routes, rootPath, { kind: "root", rootName: product.main_category_name });
    const audience = upsert(routes, audiencePath, { kind: "audience", rootName: product.main_category_name, audienceName: product.audience_name });
    const collection = upsert(routes, collectionPath, { kind: "collection", rootName: product.main_category_name, audienceName: product.audience_name, collectionName: product.product_type_name });

    root.productCount += 1;
    audience.productCount += 1;
    collection.productCount += 1;
    root.products.push(product);
    audience.products.push(product);
    collection.products.push(product);

    const localizedAudience = localizedAudienceName("en", product.audience_slug, product.audience_name);
    const localizedCollection = localizedCollectionName("en", product.product_type_slug, product.product_type_name);
    root.children.set(audiencePath, { path: audiencePath, name: localizedAudience, kind: "audience" });
    audience.children.set(collectionPath, { path: collectionPath, name: localizedCollection, kind: "collection" });
    collection.children.set(product.canonical_path, { path: product.canonical_path, name: product.product_name, kind: "product" });

    root.audienceNames.set(product.audience_slug, localizedAudience);
    root.collectionNames.set(product.product_type_slug, localizedCollection);
    audience.collectionNames.set(product.product_type_slug, localizedCollection);
  }
  return routes;
}

function routeNames(pathname: string, node: RouteNode) {
  const segments = pathname.split("/").filter(Boolean);
  const topName = localizedTopName("en", segments[1], node.rootName);
  const audienceName = segments[2] && node.audienceName ? localizedAudienceName("en", segments[2], node.audienceName) : undefined;
  const collectionName = segments[3] && node.collectionName ? localizedCollectionName("en", segments[3], node.collectionName) : undefined;
  return { topName, audienceName, collectionName };
}

function breadcrumbItems(pathname: string, node: RouteNode) {
  const segments = pathname.split("/").filter(Boolean);
  const names = routeNames(pathname, node);
  return [
    { name: "Home", path: "/" },
    { name: "Collections", path: "/products" },
    { name: names.topName, path: `/products/${segments[1]}` },
    ...(segments[2] && names.audienceName ? [{ name: names.audienceName, path: `/products/${segments[1]}/${segments[2]}` }] : []),
    ...(segments[3] && names.collectionName ? [{ name: names.collectionName, path: pathname }] : []),
  ];
}

function breadcrumbHtml(pathname: string, node: RouteNode) {
  const items = breadcrumbItems(pathname, node);
  return items.map((item, index) => index === items.length - 1
    ? `<span aria-current="page" style="color:#aaa29a">${escapeHtml(item.name)}</span>`
    : `<a href="${escapeHtml(item.path)}" style="color:#e8c477;text-decoration:none">${escapeHtml(item.name)}</a>`)
    .join('<span aria-hidden="true" style="color:#5f584e">/</span>');
}

function routeSchemas(pathname: string, title: string, description: string, node: RouteNode) {
  const canonical = `${SITE}${pathname}`;
  const crumbs = breadcrumbItems(pathname, node);
  const children = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));
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
      numberOfItems: children.length,
      itemListElement: children.map((child, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: child.name,
        url: `${SITE}${child.path}`,
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

function hierarchySummary(pathname: string, node: RouteNode) {
  const names = routeNames(pathname, node);
  if (node.kind === "root") {
    const audiences = [...node.audienceNames.values()].sort((a, b) => a.localeCompare(b));
    const collections = [...node.collectionNames.values()].sort((a, b) => a.localeCompare(b));
    return {
      eyebrow: "Published category hierarchy",
      heading: `${node.productCount} current published products`,
      body: `${names.topName} is organised into ${audiences.length} published buyer group${audiences.length === 1 ? "" : "s"} and ${collections.length} product type${collections.length === 1 ? "" : "s"}. Current buyer groups are ${audiences.join(", ")}.`,
      detailHeading: "Current product types",
      details: collections,
    };
  }
  if (node.kind === "audience") {
    const collections = [...node.collectionNames.values()].sort((a, b) => a.localeCompare(b));
    return {
      eyebrow: "Published buyer group",
      heading: `${node.productCount} current published products`,
      body: `${names.audienceName} within ${names.topName} currently contains ${collections.length} published product type${collections.length === 1 ? "" : "s"}.`,
      detailHeading: "Current product types",
      details: collections,
    };
  }
  return {
    eyebrow: "Published product type",
    heading: `${node.productCount} current published product${node.productCount === 1 ? "" : "s"}`,
    body: `${names.collectionName} is part of ${names.audienceName} within ${names.topName}. The products linked below are the current published assignments for this route.`,
    detailHeading: "Current products",
    details: node.products.map((product) => product.product_name).sort((a, b) => a.localeCompare(b)),
  };
}

function childCards(node: RouteNode) {
  const links = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  const label = node.kind === "root" ? "buyer group" : node.kind === "audience" ? "product type" : "product";
  return `<section data-irha-taxonomy-children="true" data-irha-product-count="${node.productCount}" aria-labelledby="taxonomy-children" style="margin-top:40px;border-top:1px solid #2e2a25;padding-top:30px">
    <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Canonical ${label} links</p>
    <h2 id="taxonomy-children" style="margin:0 0 10px;font-size:clamp(26px,4vw,36px)">Browse the current ${label}${links.length === 1 ? "" : "s"}</h2>
    <p style="max-width:840px;margin:0 0 18px;color:#bdb5aa">Every link below points directly to a current canonical route in the published catalogue hierarchy.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      ${links.map((item) => `<a href="${escapeHtml(item.path)}" style="display:block;border:1px solid #2e2a25;background:#111;color:#f5f1e8;padding:16px;text-decoration:none"><strong>${escapeHtml(item.name)}</strong><br><span style="color:#e8c477;font-size:13px">Open ${item.kind} →</span></a>`).join("\n      ")}
    </div>
  </section>`;
}

function representativeProducts(node: RouteNode) {
  if (node.kind === "collection") return "";
  const products = [...node.products]
    .sort((a, b) => a.reference_code.localeCompare(b.reference_code))
    .slice(0, 6);
  return `<section aria-labelledby="representative-products" style="margin-top:40px;border-top:1px solid #2e2a25;padding-top:30px">
    <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Representative current products</p>
    <h2 id="representative-products" style="margin:0 0 10px;font-size:clamp(26px,4vw,36px)">Products assigned to this hierarchy</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px">
      ${products.map((product) => `<a href="${escapeHtml(product.canonical_path)}" style="display:block;border:1px solid #2e2a25;background:#111;color:#f5f1e8;padding:16px;text-decoration:none"><span style="color:#aaa29a;font-size:12px">${escapeHtml(product.reference_code)}</span><br><strong>${escapeHtml(product.product_name)}</strong></a>`).join("\n      ")}
    </div>
  </section>`;
}

function taxonomyShell(pathname: string, node: RouteNode, h1: string, intro: string) {
  const names = routeNames(pathname, node);
  const summary = hierarchySummary(pathname, node);
  const encodedSource = encodeURIComponent(pathname);
  const detailItems = summary.details.slice(0, node.kind === "collection" ? summary.details.length : 24);
  return `<main id="irha-static-crawler-shell" data-irha-route-shell="${escapeHtml(pathname)}" data-irha-route-content="taxonomy" data-irha-taxonomy-parity="true" data-irha-taxonomy-level="${node.kind}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;line-height:1.65">
    <header style="border-bottom:1px solid #2e2a25;background:#0a0a0a">
      <div style="max-width:1120px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
        <a href="/" aria-label="Irha Apparels home" style="color:#e8c477;text-decoration:none;font-weight:700;letter-spacing:.18em;font-size:14px">IRHA APPARELS</a>
        <nav aria-label="Primary navigation" style="display:flex;flex-wrap:wrap;gap:16px;font-size:13px"><a href="/products" style="color:#f5f1e8;text-decoration:none">Products</a><a href="/manufacturing" style="color:#f5f1e8;text-decoration:none">Manufacturing</a><a href="/buyer-trust" style="color:#f5f1e8;text-decoration:none">Buyer Trust</a><a href="/contact" style="color:#f5f1e8;text-decoration:none">Contact</a></nav>
      </div>
    </header>
    <div style="max-width:1120px;margin:0 auto;padding:34px 24px 64px">
      <nav aria-label="Breadcrumb" style="display:flex;flex-wrap:wrap;gap:9px;font-size:12px;margin-bottom:28px">${breadcrumbHtml(pathname, node)}</nav>
      <section aria-labelledby="taxonomy-heading" style="max-width:920px">
        <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">Irha Apparels · Published catalogue hierarchy</p>
        <h1 id="taxonomy-heading" style="margin:0 0 20px;font-family:Georgia,serif;font-size:clamp(36px,7vw,68px);line-height:1.08;font-weight:500">${escapeHtml(h1)}</h1>
        <p data-irha-primary-introduction="true" style="max-width:840px;font-size:18px;color:#d7d0c4">${escapeHtml(intro)}</p>
        <p style="max-width:840px;color:#aaa29a">${escapeHtml(taxonomyUi("en").programNote)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:26px"><a href="/inquiry?intent=rfq&amp;source=${encodedSource}" style="display:inline-block;background:#d1ad5a;color:#090909;padding:13px 18px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Request a quotation</a><a href="/products" style="display:inline-block;border:1px solid #645943;color:#e8c477;padding:12px 18px;text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase">All categories</a></div>
      </section>
      <section aria-labelledby="route-hierarchy-summary" style="margin-top:40px;border-top:1px solid #2e2a25;padding-top:30px">
        <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">${escapeHtml(summary.eyebrow)}</p>
        <h2 id="route-hierarchy-summary" style="margin:0 0 10px;font-size:clamp(26px,4vw,36px)">${escapeHtml(summary.heading)}</h2>
        <p style="max-width:840px;margin:0;color:#c8c0b5">${escapeHtml(summary.body)}</p>
        <h3 style="margin:22px 0 8px;font-size:21px">${escapeHtml(summary.detailHeading)}</h3>
        <ul style="columns:280px;column-gap:34px;margin:0;padding-left:22px;color:#d7d0c4">${detailItems.map((item) => `<li style="break-inside:avoid;margin:7px 0">${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      ${childCards(node)}
      ${representativeProducts(node)}
      <section style="margin-top:40px;border:1px solid rgba(232,196,119,.35);background:#111;padding:26px"><h2 style="font-size:clamp(25px,4vw,34px);margin:0 0 10px">Submit the actual requirement for review.</h2><p style="max-width:840px;margin:0;color:#bdb5aa">Share the product reference, quantity, specification, branding, packaging and destination context. Feasibility and commercial details are confirmed after review.</p><p style="margin:18px 0 0"><a href="/inquiry?intent=rfq&amp;source=${encodedSource}" style="color:#e8c477">Open the quotation inquiry →</a></p></section>
    </div>
    <footer style="border-top:1px solid #2e2a25;background:#080808"><div style="max-width:1120px;margin:0 auto;padding:26px 24px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;color:#aaa29a;font-size:13px"><span>Irha Apparels · Sialkot, Punjab, Pakistan</span><span>${escapeHtml(names.collectionName ?? names.audienceName ?? names.topName)} · ${node.productCount} published product${node.productCount === 1 ? "" : "s"}</span></div></footer>
  </main>`;
}

function replaceRequired(source: string, pattern: RegExp, replacement: string, label: string, pathname: string) {
  if (!pattern.test(source)) throw new Error(`Taxonomy shell ${pathname} is missing ${label}`);
  return source.replace(pattern, replacement);
}

function renderTaxonomy(html: string, pathname: string, node: RouteNode) {
  const names = routeNames(pathname, node);
  const seo = localizedTaxonomySeo({ locale: "en", ...names });
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  let output = html;
  output = replaceRequired(output, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`, "title", pathname);
  output = replaceRequired(output, /<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${description}" />`, "description", pathname);
  output = replaceRequired(output, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${SITE}${pathname}" />`, "canonical", pathname);
  output = output.replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${title}" />`);
  output = output.replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${description}" />`);
  output = output.replace(/<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${SITE}${pathname}" />`);
  output = output.replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${title}" />`);
  output = output.replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${description}" />`);
  output = output.replace(/\s*<script data-irha-route-jsonld="true"[\s\S]*?<\/script>/gi, "");
  output = replaceRequired(output, ROUTE_SHELL, taxonomyShell(pathname, node, seo.h1, seo.intro), "base route shell", pathname);
  output = output.replace("</head>", `    ${routeSchemas(pathname, seo.h1, seo.description, node)}\n  </head>`);

  const required = [
    `<title>${title}</title>`,
    `>${escapeHtml(seo.h1)}</h1>`,
    `<link rel="canonical" href="${SITE}${pathname}"`,
    'data-irha-route-content="taxonomy"',
    'data-irha-taxonomy-parity="true"',
    'data-irha-taxonomy-children="true"',
    `data-irha-product-count="${node.productCount}"`,
    '"@type":"CollectionPage"',
    '"@type":"BreadcrumbList"',
  ];
  for (const token of required) if (!output.includes(token)) throw new Error(`Aligned taxonomy shell ${pathname} is missing ${token}`);
  for (const child of node.children.keys()) if (!output.includes(`href="${child}"`)) throw new Error(`Aligned taxonomy shell ${pathname} is missing child ${child}`);
  if (output.includes('data-irha-rich-route-shell="true"')) throw new Error(`Aligned taxonomy shell ${pathname} retained the generic rich-shell marker`);
  return output;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== EXPECTED_PRODUCTS || manifest.products.length !== EXPECTED_PRODUCTS) throw new Error("Taxonomy parity requires the complete 254-product manifest");
  const paths = routeMap(manifest.products);
  if (paths.size !== EXPECTED_TAXONOMY) throw new Error(`Expected ${EXPECTED_TAXONOMY} published taxonomy paths; received ${paths.size}`);

  for (const [pathname, node] of paths) {
    if (node.productCount < 1 || node.children.size < 1) throw new Error(`Taxonomy route is empty: ${pathname}`);
    const file = join(DIST_DIR, pathname.slice(1), "index.html");
    const html = await readFile(file, "utf8");
    if (html.includes('data-irha-product-shell="true"')) throw new Error(`Taxonomy path resolved to a product shell: ${pathname}`);
    await writeFile(file, renderTaxonomy(html, pathname, node), "utf8");
  }
  console.log(`Rendered ${paths.size} non-empty taxonomy shells from the authoritative ${manifest.products.length}-product manifest`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
