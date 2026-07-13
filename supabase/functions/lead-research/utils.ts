export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const PROVIDER = "public_search_no_api_key";
const UA = "Mozilla/5.0 (compatible; IrhaBuyerResearch/4.2; +https://www.irhaapparels.com)";
export const BUYER = /\b(wholesale|wholesaler|großhandel|grosshandel|importer|importeur|distributor|vertrieb|retailer|retail|einzelhandel|shop|store|boutique|private[ -]?label|fashion brand|e-?commerce|webshop|sourcing|procurement|händler|haendler|dealer|stockist|reseller)\b/i;
export const MAKER = /\b(manufacturer|manufacturing|factory|fabrik|producer|exporter|hersteller)\b/i;
const BLOCKED = /(^|\.)(bing\.com|duckduckgo\.com|google\.|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|pinterest\.|tiktok\.com|wikipedia\.org|amazon\.|ebay\.|etsy\.com|alibaba\.com|made-in-china\.com)/i;

export type SearchResult = { url: string; title: string; description: string; query: string; provider: string };

export function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const clean = (value: unknown, max = 500) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
export const clamp = (value: unknown, min: number, max: number, fallback: number) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Math.round(Number(value)))) : fallback;
export const list = (value: unknown) => unique(Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : typeof value === "string" ? value.split(/[,\n]/) : []);
export const unique = (values: string[]) => [...new Set(values.map((x) => x.trim()).filter(Boolean))];
export const errorText = (error: unknown) => error instanceof Error ? error.message.slice(0, 1200) : "Internal error";

export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
}

export function domain(value: unknown): string | null {
  const url = safeUrl(value);
  if (!url) return null;
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

export function isPublicUrl(value: string) {
  const url = safeUrl(value);
  if (!url) return false;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return !BLOCKED.test(h) && h.includes(".") && h !== "localhost" && !h.endsWith(".local") &&
      !/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(h);
  } catch { return false; }
}

export function inferBuyer(text: string) {
  const rules: [string, RegExp][] = [
    ["wholesaler", /wholesale|großhandel|grosshandel/i],
    ["importer", /importer|importeur/i],
    ["distributor", /distributor|vertrieb/i],
    ["retailer", /retail|shop|store|boutique|einzelhandel|händler|haendler|stockist|reseller/i],
    ["private-label brand", /private[ -]?label|fashion brand/i],
    ["ecommerce seller", /e-?commerce|webshop|online store/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || null;
}

export function productFit(text: string, requested: string[]) {
  const found: string[] = [];
  const rules: Record<string, RegExp> = {
    Lederhosen: /\b(lederhosen|lederhose|trachtenhose)\b/i,
    Dirndl: /\b(dirndl|trachtenkleid)\b/i,
    "Bavarian & Trachten": /\b(trachten|bavarian|oktoberfest)\b/i,
    Sportswear: /\b(sportswear|teamwear|tracksuit|football kit|activewear)\b/i,
    "Premium Leather": /\b(leatherwear|leather jacket|lederjacke)\b/i,
    "Streetwear & Activewear": /\b(streetwear|activewear|hoodie|jogger)\b/i,
    "Leisurewear & Nightwear": /\b(nightwear|sleepwear|pajama|pyjama|loungewear)\b/i,
  };
  for (const [name, pattern] of Object.entries(rules)) if (pattern.test(text)) found.push(name);
  for (const item of requested) if (item.toLowerCase().split(/\W+/).filter((x) => x.length > 4).some((x) => text.toLowerCase().includes(x))) found.push(item);
  return unique(found);
}

export const emailFrom = (text: string) => unique((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((x) => x.toLowerCase().replace(/[.,;:]+$/, "")))[0] || null;
export const phoneFrom = (text: string) => unique((text.match(/(?:\+|00)?\d[\d\s().\/-]{7,}\d/g) || []).filter((x) => { const n = x.replace(/\D/g, "").length; return n >= 8 && n <= 16; }).map((x) => x.trim().replace(/\s+/g, " ")))[0] || null;

function tag(source: string, name: string) { return (source.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim(); }
function strip(source: string) { return source.replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }

async function fetchTimed(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try { return await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9" } }); }
  finally { clearTimeout(timer); }
}

async function bing(query: string, limit: number): Promise<SearchResult[]> {
  const res = await fetchTimed(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Bing ${res.status}`);
  const xml = await res.text();
  const out: SearchResult[] = [];
  for (const item of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    const url = safeUrl(tag(item, "link"));
    if (!url || !isPublicUrl(url)) continue;
    out.push({ url, title: strip(tag(item, "title")) || domain(url) || "Company", description: strip(tag(item, "description")), query, provider: "bing_rss" });
    if (out.length >= limit) break;
  }
  return out;
}

async function ddg(query: string, limit: number): Promise<SearchResult[]> {
  const res = await fetchTimed(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
  const html = await res.text();
  const out: SearchResult[] = [];
  for (const anchor of html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || []) {
    if (!/result-link|result__a/i.test(anchor)) continue;
    let href = anchor.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    try { const u = new URL(href, "https://lite.duckduckgo.com"); href = u.searchParams.get("uddg") ? decodeURIComponent(u.searchParams.get("uddg")!) : href; } catch {}
    const url = safeUrl(href);
    if (!url || !isPublicUrl(url)) continue;
    out.push({ url, title: strip(anchor) || domain(url) || "Company", description: "", query, provider: "duckduckgo_lite" });
    if (out.length >= limit) break;
  }
  return out;
}

export async function publicSearch(query: string, limit: number) {
  const all: SearchResult[] = [];
  try { all.push(...await bing(query, limit)); } catch {}
  if (all.length < Math.min(4, limit)) try { all.push(...await ddg(query, limit)); } catch {}
  const seen = new Set<string>();
  const out = all.filter((item) => { const d = domain(item.url); if (!d || seen.has(d)) return false; seen.add(d); return true; }).slice(0, limit);
  if (!out.length) throw new Error("Free public search providers returned no results");
  return out;
}

export async function fetchPages(website: string) {
  const origin = new URL(website).origin;
  const urls = [website, "/contact", "/kontakt", "/impressum", "/about-us", "/shop"].map((x, i) => i === 0 ? x : new URL(x, origin).toString());
  const pages: { url: string; title: string; html: string; text: string }[] = [];
  for (const url of urls) {
    if (pages.length >= 4) break;
    try {
      if (!isPublicUrl(url)) continue;
      const res = await fetchTimed(url);
      if (!res.ok || !/text\/html|text\/plain|xhtml/i.test(res.headers.get("content-type") || "")) continue;
      const finalUrl = safeUrl(res.url);
      if (!finalUrl || !isPublicUrl(finalUrl)) continue;
      const html = (await res.text()).slice(0, 400000);
      pages.push({ url: finalUrl, title: strip(tag(html, "title")), html, text: strip(html).slice(0, 80000) });
    } catch {}
  }
  if (!pages.length) throw new Error("No readable public pages");
  return pages;
}
