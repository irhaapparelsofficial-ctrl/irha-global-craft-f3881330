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
  const staticXml = sanitizeSitemap(await readStaticSitemap(context));

  try {
    const liveEntries = await fetchPublishedCatalogue(context.env);
    const merged = mergeEntries(staticXml, liveEntries);
    return xmlResponse(merged, "public, max-age=900, s-maxage=1800, stale-while-revalidate=86400");
  } catch (error) {
    console.error("dynamic sitemap fallback", error instanceof Error ? error.message : error);
    return xmlResponse(staticXml, "public, max-age=300, s-maxage=900, stale-while-revalidate=86400");
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

  const endpoint = new URL(`${base}/rest/v1/products`);
  endpoint.searchParams.set("select", "slug,updated_at,category:categories!inner(slug,is_published)");
  endpoint.searchParams.set("is_published", "eq.true");
  endpoint.searchParams.set("category.is_published", "eq.true");
  endpoint.searchParams.set("order", "updated_at.desc");
  endpoint.searchParams.set("limit", "5000");

  const response = await fetch(endpoint.toString(), {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: "application/json",
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`Supabase catalogue returned ${response.status}`);

  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Unexpected Supabase catalogue response");

  const entries = [];
  const categoryLastmod = new Map();
  for (const row of rows) {
    const productSlug = safeSlug(row?.slug);
    const categorySlug = safeSlug(row?.category?.slug);
    if (!productSlug || !categorySlug) continue;
    const lastmod = isoDate(row?.updated_at);
    entries.push({
      loc: `${SITE_ORIGIN}/products/${categorySlug}/${productSlug}`,
      lastmod,
      changefreq: "monthly",
      priority: "0.75",
    });
    const previous = categoryLastmod.get(categorySlug);
    if (!previous || lastmod > previous) categoryLastmod.set(categorySlug, lastmod);
  }

  for (const [categorySlug, lastmod] of categoryLastmod) {
    entries.push({
      loc: `${SITE_ORIGIN}/products/${categorySlug}`,
      lastmod,
      changefreq: "weekly",
      priority: "0.90",
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

function sanitizeSitemap(xml) {
  const source = xml.includes("<urlset") ? xml : FALLBACK_XML;
  const blocks = source.match(/\s*<url>[\s\S]*?<\/url>/gi) ?? [];
  const retained = [];
  const seen = new Set();

  for (const block of blocks) {
    const rawLoc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1];
    const loc = canonicalIndexableUrl(decodeXml(rawLoc || ""));
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    retained.push(block.trim().replace(/<loc>[^<]+<\/loc>/i, `<loc>${escapeXml(loc)}</loc>`));
  }

  if (retained.length === 0 && source !== FALLBACK_XML) return sanitizeSitemap(FALLBACK_XML);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${retained.map((block) => `  ${block.replace(/\n/g, "\n  ")}`).join("\n")}\n</urlset>`;
}

function mergeEntries(xml, entries) {
  const normalized = sanitizeSitemap(xml);
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

function safeSlug(value) {
  const slug = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
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
