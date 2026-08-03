const SITE_ORIGIN = "https://irhaapparels.com";
const DEFAULT_SUPABASE_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co";
const NON_INDEXABLE_PATHS = new Set(["/studio"]);
const NON_INDEXABLE_PREFIXES = ["/intl/"];
const REMOVED_BLOG_PATHS = new Set([
  "/blog/dirndl-manufacturer-moq-50",
  "/blog/streetwear-oem-pakistan",
  "/blog/leather-grades-explained",
  "/blog/fob-sialkot-vs-cif-pricing-explained",
]);
const FALLBACK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_ORIGIN}/</loc></url>
  <url><loc>${SITE_ORIGIN}/products</loc></url>
</urlset>`;

export async function onRequestGet(context) {
  const staticXml = await readStaticSitemap(context);

  try {
    const liveEntries = await fetchPublishedCatalogue(context.env);
    const allowedCatalogPaths = new Set(
      liveEntries.map((entry) => new URL(entry.loc).pathname),
    );
    const sanitizedStatic = sanitizeSitemap(staticXml, allowedCatalogPaths);
    const merged = mergeEntries(sanitizedStatic, liveEntries);
    return xmlResponse(merged, "public, max-age=900, s-maxage=1800, stale-while-revalidate=86400");
  } catch (error) {
    console.error("dynamic sitemap fallback", error instanceof Error ? error.message : error);
    // Fail closed: if the canonical catalogue RPC is unavailable, keep core static
    // routes but do not re-emit stale/unknown deep catalogue URLs.
    const safeFallback = sanitizeSitemap(staticXml, new Set());
    return xmlResponse(safeFallback, "public, max-age=300, s-maxage=900, stale-while-revalidate=86400");
  }
}

async function readStaticSitemap(context) {
  try {
    if (context.env.ASSETS?.fetch) {
      const assetUrl = new URL("/sitemap.xml", context.request.url);
      const response = await context.env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
      if (response.ok) {
        const xml = await response.text();
        if (xml.includes("<urlset")) return xml;
      }
    }
  } catch (error) {
    console.error("static sitemap unavailable", error instanceof Error ? error.message : error);
  }
  return FALLBACK_XML;
}

async function fetchPublishedCatalogue(env) {
  const base = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) throw new Error("Supabase public key is not configured");

  // One authoritative source: the owner-reviewed public sitemap RPC already
  // returns current canonical product + taxonomy paths. Never reconstruct URLs
  // from legacy products.category_id/category slugs here.
  const endpoint = new URL(`${base}/rest/v1/rpc/get_public_sitemap_entries`);
  endpoint.searchParams.set("select", "path,lastmod,entry_kind");
  endpoint.searchParams.set("order", "entry_kind.asc,path.asc");
  endpoint.searchParams.set("limit", "1000");

  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: "{}",
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`Supabase sitemap RPC returned ${response.status}`);

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Unexpected Supabase sitemap RPC response");

  const entries = [];
  const seen = new Set();
  for (const row of rows) {
    const path = safeCatalogPath(row?.path);
    const entryKind = row?.entry_kind;
    if (!path || (entryKind !== "product" && entryKind !== "taxonomy")) {
      throw new Error("Supabase sitemap RPC returned an invalid canonical row");
    }
    if (seen.has(path)) throw new Error(`Supabase sitemap RPC returned duplicate path: ${path}`);
    seen.add(path);
    entries.push({
      loc: `${SITE_ORIGIN}${path}`,
      lastmod: isoDate(row?.lastmod),
      changefreq: entryKind === "product" ? "monthly" : "weekly",
      priority: entryKind === "product" ? "0.86" : "0.82",
    });
  }
  return entries;
}

function canonicalPath(pathname) {
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
}

function isNonIndexablePath(pathname) {
  return NON_INDEXABLE_PATHS.has(pathname)
    || REMOVED_BLOG_PATHS.has(pathname)
    || pathname === "/catalogue"
    || pathname.startsWith("/catalogue/")
    || NON_INDEXABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function canonicalIndexableUrl(value) {
  try {
    const url = new URL(value);
    if (url.origin !== SITE_ORIGIN || url.search || url.hash) return null;
    const pathname = canonicalPath(url.pathname);
    if (isNonIndexablePath(pathname)) return null;
    return `${SITE_ORIGIN}${pathname}`;
  } catch {
    return null;
  }
}

function sanitizeSitemap(xml, allowedCatalogPaths = null) {
  const source = xml.includes("<urlset") ? xml : FALLBACK_XML;
  const blocks = source.match(/\s*<url>[\s\S]*?<\/url>/gi) ?? [];
  const retained = [];
  const seen = new Set();

  for (const block of blocks) {
    const rawLoc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1];
    const loc = canonicalIndexableUrl(decodeXml(rawLoc || ""));
    if (!loc || seen.has(loc)) continue;
    const pathname = new URL(loc).pathname;
    if (pathname.startsWith("/products/") && allowedCatalogPaths && !allowedCatalogPaths.has(pathname)) {
      continue;
    }
    seen.add(loc);
    retained.push(block.trim().replace(/<loc>[^<]+<\/loc>/i, `<loc>${escapeXml(loc)}</loc>`));
  }

  if (retained.length === 0 && source !== FALLBACK_XML) {
    return sanitizeSitemap(FALLBACK_XML, allowedCatalogPaths);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${retained.map((block) => `  ${block.replace(/\n/g, "\n  ")}`).join("\n")}\n</urlset>`;
}

function mergeEntries(xml, entries) {
  const normalized = xml.includes("<urlset") ? xml : sanitizeSitemap(xml);
  const existing = new Set(
    Array.from(normalized.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => decodeXml(match[1])),
  );
  const additions = [];

  for (const entry of entries) {
    const loc = canonicalIndexableUrl(entry?.loc);
    if (!loc || existing.has(loc)) continue;
    existing.add(loc);
    additions.push([
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "",
      entry.changefreq ? `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>` : "",
      entry.priority ? `    <priority>${escapeXml(entry.priority)}</priority>` : "",
      "  </url>",
    ].filter(Boolean).join("\n"));
  }

  if (additions.length === 0) return normalized;
  return normalized.replace(/\s*<\/urlset>\s*$/i, `\n${additions.join("\n")}\n</urlset>`);
}

function safeCatalogPath(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw.startsWith("/products/") || raw.includes("?") || raw.includes("#") || raw.includes("..") || raw.includes("//")) {
    return "";
  }
  try {
    const url = new URL(raw, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return "";
    return canonicalPath(url.pathname);
  } catch {
    return "";
  }
}

function isoDate(value) {
  const parsed = typeof value === "string" ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value) {
  return String(value)
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function xmlResponse(xml, cacheControl) {
  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff",
      "content-location": `${SITE_ORIGIN}/sitemap.xml`,
    },
  });
}
