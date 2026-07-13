export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const PROVIDER = "public_search_no_api_key";
const UA = "Mozilla/5.0 (compatible; IrhaBuyerResearch/4.3; +https://www.irhaapparels.com)";
export const BUYER = /\b(wholesale|wholesaler|großhandel|grosshandel|importer|importeur|distributor|vertrieb|retailer|retail|einzelhandel|shop|store|boutique|private[ -]?label|fashion brand|e-?commerce|webshop|sourcing|procurement|händler|haendler|dealer|stockist|reseller)\b/i;
export const MAKER = /\b(manufacturer|manufacturing|factory|fabrik|producer|exporter|hersteller)\b/i;
const BLOCKED = /(^|\.)(bing\.com|duckduckgo\.com|google\.|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|pinterest\.|tiktok\.com|wikipedia\.org|amazon\.|ebay\.|etsy\.com|alibaba\.com|made-in-china\.com)/i;
const PROVIDER_HOSTS = new Set(["www.bing.com", "lite.duckduckgo.com"]);

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
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    if (url.port && !["80", "443"].includes(url.port)) return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
}

export function domain(value: unknown): string | null {
  const url = safeUrl(value);
  if (!url) return null;
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

function normalizedHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
}

function blockedIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113);
}

function blockedIpv6(ip: string) {
  const value = normalizedHostname(ip);
  if (!value.includes(":")) return false;
  if (value === "::" || value === "::1") return true;
  if (/^(fc|fd)/i.test(value) || /^fe[89ab]/i.test(value) || /^ff/i.test(value) || /^2001:db8:/i.test(value)) return true;
  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  return mapped ? blockedIpv4(mapped) : false;
}

function blockedAddress(value: string) {
  const address = normalizedHostname(value);
  return blockedIpv4(address) || blockedIpv6(address);
}

export function isPublicUrl(value: string) {
  const normalized = safeUrl(value);
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    const host = normalizedHostname(url.hostname);
    return !BLOCKED.test(host) && host.includes(".") && host !== "localhost" && !host.endsWith(".local") && !host.endsWith(".internal") && !blockedAddress(host);
  } catch { return false; }
}

async function assertPublicDestination(value: string) {
  const normalized = safeUrl(value);
  if (!normalized || !isPublicUrl(normalized)) throw new Error("Unsafe public URL");
  const url = new URL(normalized);
  const host = normalizedHostname(url.hostname);
  if (blockedAddress(host)) throw new Error("Private network destination blocked");

  const results = await Promise.allSettled([
    Deno.resolveDns(host, "A"),
    Deno.resolveDns(host, "AAAA"),
  ]);
  const addresses = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!addresses.length || addresses.some(blockedAddress)) throw new Error("Private or unresolved destination blocked");
  return url;
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

async function fetchWithTimeout(url: URL, redirect: RequestRedirect) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9" },
    });
  } finally { clearTimeout(timer); }
}

async function fetchProvider(url: string) {
  let current = new URL(url);
  for (let hop = 0; hop <= 2; hop += 1) {
    if (current.protocol !== "https:" || !PROVIDER_HOSTS.has(normalizedHostname(current.hostname))) throw new Error("Unexpected search provider redirect");
    const res = await fetchWithTimeout(current, "manual");
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location || hop === 2) throw new Error("Search provider redirect rejected");
    current = new URL(location, current);
  }
  throw new Error("Search provider redirect limit reached");
}

async function fetchPublicPage(url: string) {
  let current = await assertPublicDestination(url);
  for (let hop = 0; hop <= 3; hop += 1) {
    const res = await fetchWithTimeout(current, "manual");
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location || hop === 3) throw new Error("Public page redirect rejected");
    current = await assertPublicDestination(new URL(location, current).toString());
  }
  throw new Error("Public page redirect limit reached");
}

async function bing(query: string, limit: number): Promise<SearchResult[]> {
  const res = await fetchProvider(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`);
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
  const res = await fetchProvider(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`);
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
  const safeWebsite = await assertPublicDestination(website);
  const origin = safeWebsite.origin;
  const urls = [safeWebsite.toString(), "/contact", "/kontakt", "/impressum", "/about-us", "/shop"].map((x, i) => i === 0 ? x : new URL(x, origin).toString());
  const pages: { url: string; title: string; html: string; text: string }[] = [];
  for (const url of urls) {
    if (pages.length >= 4) break;
    try {
      const res = await fetchPublicPage(url);
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