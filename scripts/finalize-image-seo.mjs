import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const SITE_URL = "https://irhaapparels.com";
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;
const EXPECTED_SITEMAP_URLS = 407;
const IMAGE_NAMESPACE = "http://www.google.com/schemas/sitemap-image/1.1";
const TEMPORARY_QUERY_PATTERN =
  /(?:^|[?&])(?:token|signature|expires|x-amz-[^=]*|x-goog-[^=]*|policy|key-pair-id)=/i;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function safeImageUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is not an absolute image URL: ${value || "<missing>"}`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${label} must use HTTPS: ${value}`);
  if (TEMPORARY_QUERY_PATTERN.test(parsed.search) || /\/sign\/|\/signed\//i.test(parsed.pathname)) {
    throw new Error(`${label} is temporary or signed: ${value}`);
  }
  return parsed.href;
}

function routeMaps(products) {
  const productByPath = new Map();
  const taxonomyByPath = new Map();
  const ordered = [...products].sort(
    (left, right) =>
      left.reference_code.localeCompare(right.reference_code, undefined, { numeric: true })
      || left.canonical_path.localeCompare(right.canonical_path),
  );

  for (const product of ordered) {
    const primaryImage = safeImageUrl(product.image_url, `${product.reference_code} primary image`);
    if (!Array.isArray(product.gallery) || product.gallery[0] !== primaryImage) {
      throw new Error(`${product.reference_code} primary image is not gallery slot 1`);
    }
    productByPath.set(product.canonical_path, { ...product, image_url: primaryImage });

    const categoryPath = `/products/${product.main_category_slug}`;
    const audiencePath = `${categoryPath}/${product.audience_slug}`;
    const typePath = `${audiencePath}/${product.product_type_slug}`;
    const routes = [
      [categoryPath, product.main_category_name],
      [audiencePath, `${product.audience_name} ${product.main_category_name}`],
      [typePath, product.product_type_name],
    ];
    for (const [path, label] of routes) {
      if (!taxonomyByPath.has(path)) taxonomyByPath.set(path, { product, label, image_url: primaryImage });
    }
  }

  if (productByPath.size !== EXPECTED_PRODUCTS) {
    throw new Error(`Expected ${EXPECTED_PRODUCTS} canonical products; received ${productByPath.size}`);
  }
  if (taxonomyByPath.size !== EXPECTED_TAXONOMY) {
    throw new Error(`Expected ${EXPECTED_TAXONOMY} canonical taxonomy routes; received ${taxonomyByPath.size}`);
  }
  return { productByPath, taxonomyByPath };
}

function parseRouteSchemas(html, pathname) {
  const schemas = [];
  const pattern = /<script data-irha-route-jsonld="true" type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      schemas.push(JSON.parse(match[1]));
    } catch (error) {
      throw new Error(`Invalid route JSON-LD in ${pathname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return schemas;
}

function routeScripts(schemas) {
  return schemas
    .map((schema) => `<script data-irha-route-jsonld="true" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`)
    .join("\n    ");
}

function imageObject(imageUrl) {
  return { "@type": "ImageObject", url: imageUrl, contentUrl: imageUrl };
}

function replaceRouteSchemas(html, schemas) {
  const without = html.replace(/\s*<script data-irha-route-jsonld="true"[\s\S]*?<\/script>/gi, "");
  return without.replace("</head>", `    ${routeScripts(schemas)}\n  </head>`);
}

function metaPattern(kind, key) {
  return new RegExp(`<meta\\b(?=[^>]*\\b${kind}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'])[^>]*>\\s*`, "gi");
}

function alignImageMetadata(html, imageUrl, alt) {
  const targets = [
    ["property", "og:image"],
    ["property", "og:image:alt"],
    ["name", "twitter:image"],
    ["name", "twitter:image:alt"],
  ];
  let output = html;
  for (const [kind, key] of targets) output = output.replace(metaPattern(kind, key), "");

  const tags = [
    `<meta data-irha-product-image="true" property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta data-irha-product-image="true" property="og:image:alt" content="${escapeHtml(alt)}" />`,
    `<meta data-irha-product-image="true" name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta data-irha-product-image="true" name="twitter:image:alt" content="${escapeHtml(alt)}" />`,
  ].join("\n    ");
  return output.replace("</head>", `    ${tags}\n  </head>`);
}

function productSchemas(existing, product, imageUrl) {
  const canonical = `${SITE_URL}${product.canonical_path}`;
  const productId = `${canonical}#product`;
  const schemas = [];
  let productFound = false;
  let breadcrumbFound = false;

  for (const schema of existing) {
    if (schema?.["@type"] === "Product") {
      const gallery = Array.isArray(product.gallery) ? product.gallery.map((value) => safeImageUrl(value, `${product.reference_code} gallery image`)) : [];
      schemas.push({
        ...schema,
        "@id": productId,
        url: canonical,
        name: product.product_name,
        image: [imageUrl, ...gallery.filter((value) => value !== imageUrl)],
      });
      productFound = true;
      continue;
    }
    if (schema?.["@type"] === "BreadcrumbList") {
      schemas.push(schema);
      breadcrumbFound = true;
    }
  }

  if (!productFound) throw new Error(`${product.reference_code} Product schema is missing before image finalization`);
  if (!breadcrumbFound) throw new Error(`${product.reference_code} BreadcrumbList schema is missing before image finalization`);

  schemas.splice(1, 0, {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: product.seo_h1 || product.product_name,
    description: product.seo_description || product.short_description || product.product_description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": productId },
    mainEntity: { "@id": productId },
    primaryImageOfPage: imageObject(imageUrl),
    inLanguage: "en",
  });
  return schemas;
}

function taxonomySchemas(existing, pathname, imageUrl) {
  let collectionFound = false;
  let breadcrumbFound = false;
  const schemas = existing.map((schema) => {
    if (schema?.["@type"] === "CollectionPage") {
      collectionFound = true;
      return {
        ...schema,
        image: imageUrl,
        primaryImageOfPage: imageObject(imageUrl),
      };
    }
    if (schema?.["@type"] === "BreadcrumbList") breadcrumbFound = true;
    return schema;
  });
  if (!collectionFound) throw new Error(`CollectionPage schema is missing before image finalization: ${pathname}`);
  if (!breadcrumbFound) throw new Error(`BreadcrumbList schema is missing before image finalization: ${pathname}`);
  return schemas;
}

function alignPrimaryProductImage(html, product, imageUrl) {
  const escapedUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<img\\b[^>]*\\bsrc=["']${escapedUrl}["'][^>]*>`, "i");
  const match = html.match(pattern);
  if (!match) throw new Error(`${product.reference_code} primary image element is missing`);
  const replacement = `<img data-irha-primary-image="true" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`Digital catalogue reference for ${product.product_name}, view 1`)}" width="1200" height="1200" loading="eager" fetchpriority="high" decoding="async" style="width:100%;height:auto;display:block;background:#151515;object-fit:contain" />`;
  return html.replace(pattern, replacement);
}

function taxonomyFigure(entry) {
  const alt = `Digital catalogue reference for ${entry.product.product_name} representing ${entry.label}`;
  return `<figure data-irha-taxonomy-primary-image="true" style="max-width:760px;margin:34px 0 0">
        <img src="${escapeHtml(entry.image_url)}" alt="${escapeHtml(alt)}" width="1200" height="1200" loading="eager" fetchpriority="high" decoding="async" style="width:100%;height:auto;display:block;background:#151515;object-fit:contain;border:1px solid #2e2a25" />
        <figcaption style="margin-top:10px;color:#aaa29a;font-size:13px">Representative published product: ${escapeHtml(entry.product.product_name)}</figcaption>
      </figure>`;
}

function alignTaxonomyImage(html, pathname, entry) {
  const marker = 'data-irha-primary-introduction="true"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Taxonomy introduction marker is missing: ${pathname}`);
  const sectionEnd = html.indexOf("</section>", markerIndex);
  if (sectionEnd < 0) throw new Error(`Taxonomy introduction section is malformed: ${pathname}`);

  const withoutExisting = html.replace(/\s*<figure data-irha-taxonomy-primary-image="true"[\s\S]*?<\/figure>/gi, "");
  const refreshedMarkerIndex = withoutExisting.indexOf(marker);
  const refreshedSectionEnd = withoutExisting.indexOf("</section>", refreshedMarkerIndex);
  return `${withoutExisting.slice(0, refreshedSectionEnd + 10)}\n      ${taxonomyFigure(entry)}${withoutExisting.slice(refreshedSectionEnd + 10)}`;
}

async function finalizeProductHtml(product) {
  const path = join(DIST_DIR, product.canonical_path.slice(1), "index.html");
  let html = await readFile(path, "utf8");
  const imageUrl = product.image_url;
  const alt = `Digital catalogue reference for ${product.product_name}, view 1`;

  html = alignPrimaryProductImage(html, product, imageUrl);
  html = replaceRouteSchemas(html, productSchemas(parseRouteSchemas(html, product.canonical_path), product, imageUrl));
  html = alignImageMetadata(html, imageUrl, alt);
  await writeFile(path, html, "utf8");
}

async function finalizeTaxonomyHtml(pathname, entry) {
  const path = join(DIST_DIR, pathname.slice(1), "index.html");
  let html = await readFile(path, "utf8");
  const alt = `Digital catalogue reference for ${entry.product.product_name} representing ${entry.label}`;

  html = alignTaxonomyImage(html, pathname, entry);
  html = replaceRouteSchemas(html, taxonomySchemas(parseRouteSchemas(html, pathname), pathname, entry.image_url));
  html = alignImageMetadata(html, entry.image_url, alt);
  await writeFile(path, html, "utf8");
}

async function finalizeSitemap(productByPath, taxonomyByPath) {
  const sitemapPath = join(DIST_DIR, "sitemap.xml");
  const source = await readFile(sitemapPath, "utf8");
  const blocks = source.match(/\s*<url>[\s\S]*?<\/url>/gi) ?? [];
  if (blocks.length !== EXPECTED_SITEMAP_URLS) {
    throw new Error(`Expected ${EXPECTED_SITEMAP_URLS} sitemap URLs; received ${blocks.length}`);
  }

  const seen = new Set();
  const outputBlocks = blocks.map((rawBlock) => {
    let block = rawBlock.trim().replace(/\s*<image:image>[\s\S]*?<\/image:image>/gi, "");
    const rawLoc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1];
    if (!rawLoc) throw new Error("Sitemap URL block is missing <loc>");
    const pageUrl = new URL(decodeXml(rawLoc));
    if (pageUrl.origin !== SITE_URL) throw new Error(`Wrong sitemap host: ${pageUrl.href}`);
    const pathname = pageUrl.pathname === "/" ? "/" : pageUrl.pathname.replace(/\/+$/, "");
    if (seen.has(pathname)) throw new Error(`Duplicate sitemap path: ${pathname}`);
    seen.add(pathname);

    const imageUrl = productByPath.get(pathname)?.image_url ?? taxonomyByPath.get(pathname)?.image_url;
    if (imageUrl) {
      block = block.replace(
        "</url>",
        `  <image:image>\n      <image:loc>${escapeXml(safeImageUrl(imageUrl, `Sitemap image for ${pathname}`))}</image:loc>\n    </image:image>\n  </url>`,
      );
    }
    return block;
  });

  const imageCount = outputBlocks.filter((block) => block.includes("<image:image>")).length;
  if (imageCount !== EXPECTED_PRODUCTS + EXPECTED_TAXONOMY) {
    throw new Error(`Expected ${EXPECTED_PRODUCTS + EXPECTED_TAXONOMY} sitemap image entries; received ${imageCount}`);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="${IMAGE_NAMESPACE}">`,
    ...outputBlocks,
    "</urlset>",
    "",
  ].join("\n");
  await writeFile(sitemapPath, xml, "utf8");
}

async function main() {
  const manifest = JSON.parse(await readFile(join(DIST_DIR, "catalog-route-manifest.json"), "utf8"));
  if (manifest.schemaVersion !== 1 || manifest.productCount !== EXPECTED_PRODUCTS || manifest.products?.length !== EXPECTED_PRODUCTS) {
    throw new Error("Image SEO finalization requires the complete 254-product manifest");
  }

  const { productByPath, taxonomyByPath } = routeMaps(manifest.products);
  await finalizeSitemap(productByPath, taxonomyByPath);
  for (const product of productByPath.values()) await finalizeProductHtml(product);
  for (const [pathname, entry] of taxonomyByPath) await finalizeTaxonomyHtml(pathname, entry);

  console.log(
    `Finalized stable image SEO for ${productByPath.size} products and ${taxonomyByPath.size} taxonomy routes without changing media URLs`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
