import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const WORKER_PATH = resolve("dist/_worker.js");
const REQUIRED_ROUTE_SHELLS = ["products", "contact", "inquiry"];

const canonicalBefore = `    if (isStaticBuyerPath(pathname) && url.pathname !== pathname) {
      return canonicalPathRedirect(request, url, pathname);
    }`;

const canonicalAfter = `    if (
      (request.method === "GET" || request.method === "HEAD") &&
      pathname !== "/" &&
      url.pathname !== pathname &&
      isKnownHtmlRoute(pathname) &&
      !looksLikeFile(pathname)
    ) {
      return canonicalPathRedirect(request, url, pathname);
    }`;

const helperMarker = "export default {";
const helperBlock = String.raw`const FUNCTIONAL_SPA_PATHS = new Set([
  "/studio",
  "/shortlist",
  "/compare",
  "/auth",
  "/admin",
  "/login",
  "/signin",
  "/sign-in",
  "/log-in",
  "/dashboard",
  "/de",
  "/de/katalog",
  "/legacy-home",
  "/seo-indexing",
  "/sustainability",
  "/catalog",
  "/journal",
]);

const FUNCTIONAL_SPA_PREFIXES = ["/admin/", "/auth/", "/journal/"];
const FUNCTIONAL_NOINDEX_PATHS = new Set(["/studio", "/shortlist", "/compare"]);
const FUNCTIONAL_NOINDEX_PREFIXES = ["/intl/"];
const CANONICAL_PRODUCT_ROUTE = /^\/products\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/;
const DEFAULT_PRODUCT_SUPABASE_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co";

function dynamicEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dynamicPlainText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function dynamicImageUrl(value) {
  try {
    const parsed = new URL(dynamicPlainText(value));
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function isCanonicalProductPath(pathname) {
  return CANONICAL_PRODUCT_ROUTE.test(normalizePath(pathname));
}

function productSupabaseConfig(env) {
  const base = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_PRODUCT_SUPABASE_URL).replace(/\/+$/, "");
  const key = String(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
  return { base, key };
}

async function fetchPublishedProduct(env, pathname) {
  const { base, key } = productSupabaseConfig(env);
  if (!key) throw new Error("Supabase public catalogue key is not configured");

  const endpoint = new URL(base + "/rest/v1/products");
  endpoint.searchParams.set(
    "select",
    "sku,reference_code,slug,name,description,short_description,image_url,gallery,specs,details,seo_title,seo_description,seo_h1,canonical_path,main_category,audience_group,product_type,moq_display,country_of_origin",
  );
  endpoint.searchParams.set("canonical_path", "eq." + pathname);
  endpoint.searchParams.set("is_published", "eq.true");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint.toString(), {
    headers: {
      apikey: key,
      authorization: "Bearer " + key,
      accept: "application/json",
    },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!response.ok) throw new Error("Published catalogue lookup returned " + response.status);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const product = rows[0];
  return product?.canonical_path === pathname ? product : null;
}

function productBreadcrumbs(product, pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const labels = [
    "Products",
    dynamicPlainText(product.main_category, segments[1]),
    dynamicPlainText(product.audience_group, segments[2]),
    dynamicPlainText(product.product_type, segments[3]),
    dynamicPlainText(product.name, segments[4]),
  ];
  const items = [{ href: "/", label: "Home" }];
  let current = "";
  for (let index = 0; index < segments.length; index += 1) {
    current += "/" + segments[index];
    items.push({ href: current, label: labels[index] || segments[index] });
  }
  return items;
}

function productCrawlerShell(product, pathname) {
  const name = dynamicPlainText(product.name, "Custom Apparel Product");
  const description = dynamicPlainText(
    product.description,
    dynamicPlainText(product.short_description, "Custom B2B apparel manufacturing by Irha Apparels."),
  );
  const frontImage = dynamicImageUrl(product.image_url);
  const specs = Array.isArray(product.specs)
    ? product.specs.filter((item) => typeof item === "string" && item.trim()).slice(0, 8)
    : [];
  const breadcrumbs = productBreadcrumbs(product, pathname);
  const breadcrumbHtml = breadcrumbs
    .map((item, index) => {
      const last = index === breadcrumbs.length - 1;
      const label = dynamicEscapeHtml(item.label);
      return last
        ? '<span aria-current="page" style="color:#aaa29a">' + label + "</span>"
        : '<a href="' + dynamicEscapeHtml(item.href) + '" style="color:#e8c477;text-decoration:none">' + label + "</a>";
    })
    .join('<span aria-hidden="true" style="color:#5f584e">/</span>');
  const specsHtml = specs.length
    ? '<ul style="margin:0;padding-left:20px;color:#c8c0b5">' +
      specs.map((item) => "<li>" + dynamicEscapeHtml(item) + "</li>").join("") +
      "</ul>"
    : '<p style="margin:0;color:#c8c0b5">Materials, construction, sizing, branding and packaging are confirmed against the buyer-approved specification.</p>';
  const imageHtml = frontImage
    ? '<img src="' + dynamicEscapeHtml(frontImage) + '" alt="' + dynamicEscapeHtml(name + " front view") + '" width="1200" height="1200" fetchpriority="high" style="display:block;width:100%;height:auto;object-fit:contain;background:#111;border:1px solid #2e2a25" />'
    : "";
  const source = encodeURIComponent(pathname);

  return [
    '<main id="irha-static-crawler-shell" data-irha-route-shell="', dynamicEscapeHtml(pathname), '" data-irha-product-route-shell="true" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;line-height:1.65">',
    '<header style="border-bottom:1px solid #2e2a25;background:#0a0a0a"><div style="max-width:1180px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">',
    '<a href="/" aria-label="Irha Apparels home" style="color:#e8c477;text-decoration:none;font-weight:700;letter-spacing:.18em;font-size:14px">IRHA APPARELS</a>',
    '<nav aria-label="Primary navigation" style="display:flex;flex-wrap:wrap;gap:16px;font-size:13px"><a href="/products" style="color:#f5f1e8;text-decoration:none">Products</a><a href="/manufacturing" style="color:#f5f1e8;text-decoration:none">Manufacturing</a><a href="/buyer-trust" style="color:#f5f1e8;text-decoration:none">Buyer Trust</a><a href="/contact" style="color:#f5f1e8;text-decoration:none">Contact</a></nav>',
    '</div></header>',
    '<div style="max-width:1180px;margin:0 auto;padding:30px 24px 68px">',
    '<nav aria-label="Breadcrumb" style="display:flex;flex-wrap:wrap;gap:9px;font-size:12px;margin-bottom:26px">', breadcrumbHtml, '</nav>',
    '<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:38px;align-items:start">',
    '<div>', imageHtml, '</div>',
    '<div><p style="margin:0 0 10px;letter-spacing:.16em;text-transform:uppercase;font-size:12px;color:#c9a45c">', dynamicEscapeHtml(dynamicPlainText(product.reference_code, product.sku)), ' · B2B Custom Manufacturing</p>',
    '<h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:clamp(36px,6vw,64px);line-height:1.06;font-weight:500">', dynamicEscapeHtml(dynamicPlainText(product.seo_h1, name)), '</h1>',
    '<p style="font-size:18px;color:#d7d0c4">', dynamicEscapeHtml(description), '</p>',
    '<div style="border:1px solid rgba(232,196,119,.32);background:#111;padding:22px;margin:24px 0"><h2 style="margin:0 0 12px;font-size:24px">Buyer specification options</h2>', specsHtml, '</div>',
    '<p style="color:#aaa29a"><strong style="color:#f5f1e8">MOQ:</strong> ', dynamicEscapeHtml(dynamicPlainText(product.moq_display, "Confirmed after specification review")), '</p>',
    '<p style="color:#aaa29a"><strong style="color:#f5f1e8">Origin:</strong> ', dynamicEscapeHtml(dynamicPlainText(product.country_of_origin, "Sialkot, Pakistan")), '</p>',
    '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:26px"><a href="/inquiry?intent=rfq&amp;source=', source, '" style="display:inline-block;background:#d1ad5a;color:#090909;padding:13px 18px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Request a Manufacturing Quote</a><a href="https://wa.me/923204110066" style="display:inline-block;border:1px solid #645943;color:#f5f1e8;padding:12px 18px;text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Discuss on WhatsApp</a></div>',
    '</div></section>',
    '<section style="margin-top:48px;border-top:1px solid #2e2a25;padding-top:34px"><h2 style="font-size:clamp(28px,5vw,42px);margin:0 0 16px">OEM, ODM and private-label production</h2><p style="max-width:900px;color:#bdb5aa">Irha Apparels develops made-to-order programs for brands, wholesalers, importers, retailers, clubs and sourcing professionals. Materials, samples, quantities, branding, labels, packaging, production timing and shipping are confirmed after the actual buyer requirement is reviewed.</p></section>',
    '</div><footer style="border-top:1px solid #2e2a25;background:#080808"><div style="max-width:1180px;margin:0 auto;padding:28px 24px;color:#aaa29a;font-size:13px">Irha Apparels · B2B custom apparel manufacturer · Sialkot, Pakistan · <a href="mailto:info@irhaapparels.com" style="color:#e8c477">info@irhaapparels.com</a> · <a href="tel:+923204110066" style="color:#e8c477">+92 320 4110066</a></div></footer>',
    '</main>',
  ].join("");
}

function productStructuredData(product, pathname) {
  const canonical = APEX_ORIGIN + pathname;
  const name = dynamicPlainText(product.name, "Custom Apparel Product");
  const description = dynamicPlainText(product.seo_description, dynamicPlainText(product.short_description, product.description));
  const front = dynamicImageUrl(product.image_url);
  const gallery = Array.isArray(product.gallery) ? product.gallery.map(dynamicImageUrl).filter(Boolean) : [];
  const images = [...new Set([front, ...gallery].filter(Boolean))];
  const breadcrumbs = productBreadcrumbs(product, pathname);
  const properties = [
    ["Audience", product.audience_group],
    ["Product Type", product.product_type],
    ["MOQ", product.moq_display],
  ]
    .filter(([, value]) => dynamicPlainText(value))
    .map(([propertyName, value]) => ({ "@type": "PropertyValue", propertyID: propertyName, value: dynamicPlainText(value) }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": APEX_ORIGIN + "/#organization",
        name: "Irha Apparels",
        url: APEX_ORIGIN + "/",
        logo: APEX_ORIGIN + "/icon-512x512.png",
        email: "info@irhaapparels.com",
        telephone: "+92 320 4110066",
      },
      {
        "@type": "WebSite",
        "@id": APEX_ORIGIN + "/#website",
        url: APEX_ORIGIN + "/",
        name: "Irha Apparels",
        publisher: { "@id": APEX_ORIGIN + "/#organization" },
        inLanguage: "en",
      },
      {
        "@type": "WebPage",
        "@id": canonical + "#webpage",
        url: canonical,
        name: dynamicPlainText(product.seo_title, name + " | Irha Apparels"),
        description,
        primaryImageOfPage: front ? { "@type": "ImageObject", url: front } : undefined,
        isPartOf: { "@id": APEX_ORIGIN + "/#website" },
        about: { "@id": canonical + "#product" },
        breadcrumb: { "@id": canonical + "#breadcrumb" },
        inLanguage: "en",
      },
      {
        "@type": "BreadcrumbList",
        "@id": canonical + "#breadcrumb",
        itemListElement: breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          item: APEX_ORIGIN + item.href,
        })),
      },
      {
        "@type": "Product",
        "@id": canonical + "#product",
        name,
        description,
        image: images,
        sku: dynamicPlainText(product.sku, product.reference_code),
        category: dynamicPlainText(product.main_category, "Custom Apparel"),
        url: canonical,
        brand: { "@type": "Brand", name: "Irha Apparels" },
        manufacturer: { "@id": APEX_ORIGIN + "/#organization" },
        countryOfOrigin: { "@type": "Country", name: "Pakistan" },
        additionalProperty: properties,
      },
    ],
  };
}

function replaceOrInsertHead(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace("</head>", "    " + replacement + "\n  </head>");
}

function renderProductTemplate(template, product, pathname) {
  const canonical = APEX_ORIGIN + pathname;
  const name = dynamicPlainText(product.name, "Custom Apparel Product");
  const title = dynamicPlainText(product.seo_title, name + " Manufacturer | Irha Apparels");
  const description = dynamicPlainText(product.seo_description, dynamicPlainText(product.short_description, product.description)).slice(0, 320);
  const front = dynamicImageUrl(product.image_url);
  const escapedTitle = dynamicEscapeHtml(title);
  const escapedDescription = dynamicEscapeHtml(description);
  const escapedCanonical = dynamicEscapeHtml(canonical);
  const escapedFront = dynamicEscapeHtml(front);
  const preload = front
    ? '<link data-irha-product-lcp rel="preload" as="image" type="image/webp" href="' + escapedFront + '" fetchpriority="high" />'
    : "";
  const jsonLd = '<script data-irha-product-jsonld="true" type="application/ld+json">' +
    JSON.stringify(productStructuredData(product, pathname)).replace(/</g, "\\u003c") +
    "</script>";

  let html = template;
  html = replaceOrInsertHead(html, /<title>[\s\S]*?<\/title>/i, "<title>" + escapedTitle + "</title>");
  html = replaceOrInsertHead(html, /<meta[^>]+name="description"[^>]*>/i, '<meta name="description" content="' + escapedDescription + '" />');
  html = replaceOrInsertHead(html, /<link[^>]+rel="canonical"[^>]*>/i, '<link rel="canonical" href="' + escapedCanonical + '" />');
  html = replaceOrInsertHead(html, /<meta[^>]+property="og:title"[^>]*>/i, '<meta property="og:title" content="' + escapedTitle + '" />');
  html = replaceOrInsertHead(html, /<meta[^>]+property="og:description"[^>]*>/i, '<meta property="og:description" content="' + escapedDescription + '" />');
  html = replaceOrInsertHead(html, /<meta[^>]+property="og:url"[^>]*>/i, '<meta property="og:url" content="' + escapedCanonical + '" />');
  html = replaceOrInsertHead(html, /<meta[^>]+property="og:type"[^>]*>/i, '<meta property="og:type" content="product" />');
  if (front) {
    html = replaceOrInsertHead(html, /<meta[^>]+property="og:image"[^>]*>/i, '<meta property="og:image" content="' + escapedFront + '" />');
    html = replaceOrInsertHead(html, /<meta[^>]+property="og:image:alt"[^>]*>/i, '<meta property="og:image:alt" content="' + dynamicEscapeHtml(name + " front view") + '" />');
    html = replaceOrInsertHead(html, /<meta[^>]+name="twitter:image"[^>]*>/i, '<meta name="twitter:image" content="' + escapedFront + '" />');
  }
  html = replaceOrInsertHead(html, /<meta[^>]+name="twitter:title"[^>]*>/i, '<meta name="twitter:title" content="' + escapedTitle + '" />');
  html = replaceOrInsertHead(html, /<meta[^>]+name="twitter:description"[^>]*>/i, '<meta name="twitter:description" content="' + escapedDescription + '" />');
  html = html.replace(/<link(?=[^>]*data-irha-home-lcp)[^>]*\/?>/i, preload);
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLd);
  html = html.replace(/<main id="irha-static-crawler-shell"[\s\S]*?<\/main>/i, productCrawlerShell(product, pathname));
  return html;
}

async function productRouteShellResponse(request, env, pathname) {
  try {
    const product = await fetchPublishedProduct(env, pathname);
    if (!product) return notFoundResponse(request, pathname);

    const templateUrl = new URL(request.url);
    templateUrl.pathname = "/index.html";
    templateUrl.search = "";
    templateUrl.hash = "";
    const templateResponse = await env.ASSETS.fetch(
      new Request(templateUrl.toString(), { method: "GET", headers: { Accept: "text/html" } }),
    );
    if (!templateResponse.ok) throw new Error("Application shell unavailable: " + templateResponse.status);
    const template = await templateResponse.text();
    const rendered = renderProductTemplate(template, product, pathname);
    const headers = new Headers(templateResponse.headers);
    headers.delete("Location");
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Content-Location", APEX_ORIGIN + pathname);
    headers.set("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=86400");
    headers.set("X-Irha-Product-Shell", "dynamic-published-catalogue");
    headers.set("X-Irha-Product-Reference", dynamicPlainText(product.reference_code, product.sku));
    headers.set("Vary", "Accept-Encoding");
    return new Response(request.method === "HEAD" ? null : rendered, { status: 200, headers });
  } catch (error) {
    console.error("product route shell", error instanceof Error ? error.message : error);
    return new Response(
      request.method === "HEAD" ? null : "Product page is temporarily unavailable",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "X-Irha-Product-Shell": "upstream-unavailable",
        },
      },
    );
  }
}

async function officialFaviconResponse(request, env) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = "/favicon.svg";
  assetUrl.search = "";
  assetUrl.hash = "";

  const assetResponse = await env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      method: "GET",
      headers: { Accept: "image/svg+xml" },
    }),
  );

  if (!assetResponse.ok) {
    return new Response("Official favicon unavailable", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Irha-Favicon-Asset-Status": String(assetResponse.status),
      },
    });
  }

  const headers = new Headers(assetResponse.headers);
  headers.delete("Location");
  headers.set("Content-Type", "image/svg+xml; charset=utf-8");
  headers.set("Content-Location", APEX_ORIGIN + "/favicon.svg");
  headers.set("Cache-Control", "public, max-age=86400, must-revalidate");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Irha-Favicon-Source", "official-owner-crest");

  return new Response(request.method === "HEAD" ? null : assetResponse.body, {
    status: 200,
    headers,
  });
}

function explicitRouteAssetPath(pathname) {
  const normalized = normalizePath(pathname);
  if (normalized === "/" || looksLikeFile(normalized) || isStaticBuyerPath(normalized)) return null;
  if (FUNCTIONAL_SPA_PATHS.has(normalized)) return null;
  if (FUNCTIONAL_SPA_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return null;
  if (!isKnownHtmlRoute(normalized)) return null;
  return normalized + "/index.html";
}

async function routeShellAssetResponse(request, env, pathname, assetPath) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath;
  assetUrl.search = "";
  assetUrl.hash = "";

  const explicitResponse = await env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      method: "GET",
      headers: { Accept: "text/html" },
    }),
  );

  if (!explicitResponse.ok) return notFoundResponse(request, pathname);

  const headers = new Headers(explicitResponse.headers);
  headers.delete("Location");
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Content-Location", pathname === "/" ? APEX_ORIGIN : APEX_ORIGIN + pathname);
  headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  headers.set("X-Irha-Route-Shell-Asset", assetPath);

  return new Response(request.method === "HEAD" ? null : explicitResponse.body, {
    status: 200,
    headers,
  });
}

`;

const assetBefore = `    const assetResponse = await env.ASSETS.fetch(request);
    if (shouldNoIndex(pathname)) {
      return withNoIndexHeaders(assetResponse, "private-route");
    }
    if (shouldNoIndexCategoryQuery(pathname, url.searchParams)) {
      return withNoIndexHeaders(assetResponse, "functional-category-query");
    }
    return assetResponse;`;

const assetAfter = `    if (
      (request.method === "GET" || request.method === "HEAD") &&
      pathname === "/favicon.ico"
    ) {
      return officialFaviconResponse(request, env);
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      isCanonicalProductPath(pathname)
    ) {
      return productRouteShellResponse(request, env, pathname);
    }

    const explicitAssetPath = explicitRouteAssetPath(pathname);
    const assetResponse = explicitAssetPath
      ? await routeShellAssetResponse(request, env, pathname, explicitAssetPath)
      : await env.ASSETS.fetch(request);
    if (FUNCTIONAL_NOINDEX_PATHS.has(pathname)) {
      return withNoIndexHeaders(assetResponse, "functional-public-tool");
    }
    if (FUNCTIONAL_NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return withNoIndexHeaders(assetResponse, "localized-draft");
    }
    if (shouldNoIndex(pathname)) {
      return withNoIndexHeaders(assetResponse, "private-route");
    }
    if (shouldNoIndexCategoryQuery(pathname, url.searchParams)) {
      return withNoIndexHeaders(assetResponse, "functional-category-query");
    }
    return assetResponse;`;

async function verifyRichRouteShells() {
  for (const route of REQUIRED_ROUTE_SHELLS) {
    const path = resolve("dist", route, "index.html");
    const html = await readFile(path, "utf8");
    const required = [
      'data-irha-rich-route-shell="true"',
      "info@irhaapparels.com",
      "+92 320 4110066",
      "Five specialist apparel categories",
      "Request a Manufacturing Quote",
    ];
    for (const token of required) {
      if (!html.includes(token)) throw new Error(`${route}/index.html is missing crawler token: ${token}`);
    }
  }
}

async function main() {
  let worker = await readFile(WORKER_PATH, "utf8");

  if (!worker.includes(canonicalBefore)) {
    throw new Error("Cloudflare worker canonical route block changed; explicit route patch was not applied");
  }
  worker = worker.replace(canonicalBefore, canonicalAfter);

  if (!worker.includes(helperMarker)) {
    throw new Error("Cloudflare worker export marker is missing");
  }
  worker = worker.replace(helperMarker, `${helperBlock}${helperMarker}`);

  if (!worker.includes(assetBefore)) {
    throw new Error("Cloudflare worker generic asset block changed; explicit route patch was not applied");
  }
  worker = worker.replace(assetBefore, assetAfter);

  const requiredWorkerTokens = [
    "officialFaviconResponse",
    'pathname === "/favicon.ico"',
    'assetUrl.pathname = "/favicon.svg"',
    'X-Irha-Favicon-Source", "official-owner-crest',
    "explicitRouteAssetPath",
    "routeShellAssetResponse",
    "X-Irha-Route-Shell-Asset",
    "canonicalPathRedirect(request, url, pathname)",
    "FUNCTIONAL_SPA_PATHS",
    "FUNCTIONAL_NOINDEX_PATHS",
    "FUNCTIONAL_NOINDEX_PREFIXES",
    'withNoIndexHeaders(assetResponse, "localized-draft")',
    "return notFoundResponse(request, pathname)",
    'withNoIndexHeaders(assetResponse, "functional-public-tool")',
    "CANONICAL_PRODUCT_ROUTE",
    "fetchPublishedProduct",
    "productRouteShellResponse",
    "data-irha-product-jsonld",
    "data-irha-product-route-shell",
    "X-Irha-Product-Shell",
    "isCanonicalProductPath(pathname)",
  ];
  for (const token of requiredWorkerTokens) {
    if (!worker.includes(token)) throw new Error(`Patched Cloudflare worker is missing: ${token}`);
  }

  await verifyRichRouteShells();
  await writeFile(WORKER_PATH, worker, "utf8");
  console.log("Patched Cloudflare worker with dynamic published-product SEO shells, official favicon, explicit route assets, 404s and noindex handling");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
