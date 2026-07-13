export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const PROVIDER = "public_search_no_api_key";
export const CLASSIFIER = "deterministic_rules";
const UA = "Mozilla/5.0 (compatible; IrhaBuyerResearch/6.1; +https://www.irhaapparels.com)";

export const DOWNSTREAM_BUYER = /\b(retailer|retail|shop|store|boutique|modehaus|trachtenhaus|fachgesch[aä]ft|einzelhandel|h[aä]ndler|haendler|webshop|online[- ]?shop|importer|importeur|distributor|vertrieb|multi[- ]?brand|department store|warenhaus|event supplier|costume shop|rental shop|stockist|reseller)\b/i;
export const WHOLESALE_BUYER = /\b(wholesale|wholesaler|gro[ßs]handel|bulk buyer|b2b shop)\b/i;
export const MAKER = /\b(manufacturer|manufacturing|factory|fabrik|producer|exporter|supplier|hersteller|produktion|custom maker|private label manufacturer)\b/i;
const BLOCKED = /(^|\.)(bing\.com$|duckduckgo\.com$|google\.|facebook\.com$|instagram\.com$|linkedin\.com$|youtube\.com$|pinterest\.|tiktok\.com$|wikipedia\.|reddit\.|amazon\.|ebay\.|etsy\.com$|alibaba\.|aliexpress\.|indiamart\.|made-in-china\.|globalsources\.)/i;
const PROVIDER_HOSTS = new Set(["www.bing.com", "lite.duckduckgo.com", "nominatim.openstreetmap.org"]);

const PRODUCT_RULES: Record<string, RegExp> = {
  Lederhosen: /\b(lederhosen|lederhose|trachtenhose|bundhose)\b/i,
  Dirndl: /\b(dirndl|dirndls|trachtenkleid|trachtenmode)\b/i,
  "Bavarian & Trachten": /\b(trachten|bavarian|bayern|oktoberfest|alpine wear)\b/i,
  Sportswear: /\b(sportswear|teamwear|tracksuit|football kit|soccer kit|activewear|training wear)\b/i,
  "Premium Leather": /\b(leatherwear|leather jacket|lederjacke|biker jacket|leather vest)\b/i,
  "Streetwear & Activewear": /\b(streetwear|activewear|hoodie|jogger|sweatshirt)\b/i,
  "Leisurewear & Nightwear": /\b(nightwear|sleepwear|pajama|pyjama|loungewear)\b/i,
};

export type SearchResult = {
  url: string;
  title: string;
  description: string;
  query: string;
  provider: "duckduckgo_lite" | "bing_rss" | "openstreetmap_nominatim";
  country?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  raw?: unknown;
};

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
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const url = safeUrl(value);
  if (!url) return false;
  try {
    const parsed = new URL(url), h = normalizedHostname(parsed.hostname);
    return !BLOCKED.test(h) && h.includes(".") && h !== "localhost" && !h.endsWith(".local") && !h.endsWith(".internal") &&
      !blockedAddress(h) && h.replace(/^www\./, "") !== "irhaapparels.com" && !h.endsWith(".irhaapparels.com");
  } catch { return false; }
}

async function assertPublicDestination(value: string) {
  const normalized = safeUrl(value);
  if (!normalized || !isPublicUrl(normalized)) throw new Error("Unsafe public URL");
  const url = new URL(normalized);
  const host = normalizedHostname(url.hostname);
  const resolutions = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
  const addresses = resolutions.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!addresses.length || addresses.some(blockedAddress)) throw new Error("Private or unresolved destination blocked");
  return url;
}

export function inferBuyer(text: string) {
  const rules: [string, RegExp][] = [
    ["importer", /\b(importer|importeur)\b/i],
    ["distributor", /\b(distributor|vertrieb)\b/i],
    ["wholesaler", /\b(wholesale|wholesaler|gro[ßs]handel)\b/i],
    ["multi-brand retailer", /\b(multi[- ]?brand|modehaus|department store|warenhaus)\b/i],
    ["retailer", /\b(retail|shop|store|boutique|einzelhandel|h[aä]ndler|haendler|webshop|fachgesch[aä]ft|stockist|reseller)\b/i],
    ["event supplier", /\b(event supplier|oktoberfest supplier|costume rental|rental shop)\b/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || null;
}

export function productFit(text: string, requested: string[]) {
  const found: string[] = [];
  for (const [name, pattern] of Object.entries(PRODUCT_RULES)) if (pattern.test(text)) found.push(name);
  const lower = text.toLowerCase();
  for (const item of requested) {
    if (item.toLowerCase().split(/\W+/).filter((x) => x.length > 4).some((x) => lower.includes(x))) found.push(item);
  }
  return unique(found);
}

export const validEmail = (value: unknown) => {
  if (typeof value !== "string") return null;
  const email = value.toLowerCase().trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

export const emailsFrom = (text: string) => unique((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((x) => x.toLowerCase().replace(/[.,;:]+$/, ""))).filter((x) => !!validEmail(x));
export const emailFrom = (text: string, expectedDomain?: string | null) => emailsFrom(text).find((x) => expectedDomain && x.endsWith(`@${expectedDomain}`)) || emailsFrom(text).find((x) => /^(info|sales|contact|office|shop|service|einkauf|orders)@/i.test(x)) || emailsFrom(text)[0] || null;
export const phoneFrom = (text: string) => unique((text.match(/(?:\+|00)?\d[\d\s().\/-]{7,}\d/g) || []).filter((x) => { const n = x.replace(/\D/g, "").length; return n >= 8 && n <= 16; }).map((x) => x.trim().replace(/\s+/g, " ")))[0] || null;

export function whatsappFrom(html: string, text: string) {
  const href = html.match(/(?:wa\.me\/|phone=)([0-9+%]{8,20})/i);
  if (href) {
    const digits = decodeSafe(href[1]).replace(/\D/g, "");
    if (digits.length >= 8) return `+${digits}`;
  }
  return text.match(/whats\s*app[^+\d]{0,30}((?:\+|00)?\d[\d\s().\/-]{7,}\d)/i)?.[1]?.trim() || null;
}

function tag(source: string, name: string) { return (source.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim(); }
function attr(source: string, name: string) { return source.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] || ""; }
function decodeSafe(value: string) { try { return decodeURIComponent(value); } catch { return value; } }
function entities(value: string) {
  return value.replace(/&#x([0-9a-f]+);/gi, (_m, x) => String.fromCodePoint(parseInt(x, 16))).replace(/&#(\d+);/g, (_m, x) => String.fromCodePoint(parseInt(x, 10))).replace(/&(amp|quot|apos|lt|gt|nbsp|auml|ouml|uuml|Auml|Ouml|Uuml|szlig);/g, (_m, x) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß" } as Record<string, string>)[x]);
}
export function strip(source: string) { return entities(source.replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }

async function fetchWithTimeout(url: URL, init: RequestInit = {}, timeout = 12000, redirect: RequestRedirect = "manual") {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...init, signal: controller.signal, redirect, headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9", ...(init.headers || {}) } }); }
  finally { clearTimeout(timer); }
}

async function fetchProvider(url: string, init: RequestInit = {}, timeout = 12000) {
  let current = new URL(url);
  for (let hop = 0; hop <= 2; hop += 1) {
    if (current.protocol !== "https:" || !PROVIDER_HOSTS.has(normalizedHostname(current.hostname))) throw new Error("Unexpected provider redirect");
    const res = await fetchWithTimeout(current, init, timeout);
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location || hop === 2) throw new Error("Provider redirect rejected");
    current = new URL(location, current);
  }
  throw new Error("Provider redirect limit reached");
}

async function fetchPublicPage(url: string, init: RequestInit = {}, timeout = 12000) {
  let current = await assertPublicDestination(url);
  for (let hop = 0; hop <= 3; hop += 1) {
    const res = await fetchWithTimeout(current, init, timeout);
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location || hop === 3) throw new Error("Public redirect rejected");
    current = await assertPublicDestination(new URL(location, current).toString());
  }
  throw new Error("Public redirect limit reached");
}

async function bing(query: string, limit: number): Promise<SearchResult[]> {
  const res = await fetchProvider(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/rss+xml,application/xml,text/xml;q=0.9" } });
  if (!res.ok) throw new Error(`Bing ${res.status}`);
  const xml = await res.text(), out: SearchResult[] = [];
  for (const item of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    const url = safeUrl(tag(item, "link"));
    if (!url || !isPublicUrl(url)) continue;
    out.push({ url, title: strip(tag(item, "title")) || domain(url) || "Company", description: strip(tag(item, "description")), query, provider: "bing_rss" });
    if (out.length >= limit) break;
  }
  return out;
}

async function ddg(query: string, limit: number): Promise<SearchResult[]> {
  const res = await fetchProvider(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, { headers: { Accept: "text/html,application/xhtml+xml" } });
  if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
  const html = await res.text(), out: SearchResult[] = [];
  let cursor = 0;
  for (const anchor of html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || []) {
    if (!/result-link|result__a/i.test(anchor)) continue;
    let href = attr(anchor, "href");
    try { const u = new URL(href, "https://lite.duckduckgo.com"); href = u.searchParams.get("uddg") ? decodeSafe(u.searchParams.get("uddg")!) : href; } catch {}
    const url = safeUrl(href);
    if (!url || !isPublicUrl(url)) continue;
    const index = html.indexOf(anchor, cursor); cursor = Math.max(cursor, index + anchor.length);
    const following = index >= 0 ? html.slice(index + anchor.length, index + anchor.length + 1800) : "";
    const snippet = following.match(/class=["']result-snippet["'][^>]*>([\s\S]*?)<\/td>/i)?.[1] || "";
    out.push({ url, title: strip(anchor) || domain(url) || "Company", description: strip(snippet), query, provider: "duckduckgo_lite" });
    if (out.length >= limit) break;
  }
  return out;
}

export async function publicSearch(query: string, limit: number) {
  const all: SearchResult[] = [];
  try { all.push(...await ddg(query, limit)); } catch {}
  if (all.length < Math.min(3, limit)) try { all.push(...await bing(query, limit)); } catch {}
  const out = dedupeResults(all).slice(0, limit);
  if (!out.length) throw new Error("Free public search providers returned no results");
  return out;
}

export async function openStreetMapSearch(market: string, products: string[], limit: number) {
  const product = products.find((x) => /lederhosen|dirndl|trachten/i.test(x)) || "Trachten";
  const query = `${product} shop ${market}`;
  const codes: string[] = [];
  if (/germany|deutschland|dach/i.test(market)) codes.push("de");
  if (/austria|österreich|dach/i.test(market)) codes.push("at");
  if (/switzerland|schweiz|dach/i.test(market)) codes.push("ch");
  if (/netherlands|nederland/i.test(market)) codes.push("nl");
  const params = new URLSearchParams({ format: "jsonv2", q: query, limit: String(Math.min(20, Math.max(1, limit))), addressdetails: "1", extratags: "1", namedetails: "1", "accept-language": "de,en" });
  if (codes.length) params.set("countrycodes", unique(codes).join(","));
  const res = await fetchProvider(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { Accept: "application/json" } }, 15000);
  if (!res.ok) throw new Error(`OpenStreetMap ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [] as SearchResult[];
  const out: SearchResult[] = [];
  for (const place of data) {
    const tags = place?.extratags && typeof place.extratags === "object" ? place.extratags : {};
    const url = safeUrl(tags.website || tags["contact:website"] || tags.url);
    if (!url || !isPublicUrl(url)) continue;
    const address = place?.address && typeof place.address === "object" ? place.address : {};
    out.push({
      url,
      title: clean(place?.namedetails?.name || place?.name || String(place?.display_name || "").split(",")[0], 300) || domain(url) || "Company",
      description: clean(place?.display_name, 1200),
      query,
      provider: "openstreetmap_nominatim",
      country: clean(address.country, 100) || null,
      city: clean(address.city || address.town || address.village || address.municipality, 120) || null,
      email: validEmail(tags.email || tags["contact:email"]),
      phone: clean(tags.phone || tags["contact:phone"], 100) || null,
      raw: { place_id: place.place_id, osm_type: place.osm_type, osm_id: place.osm_id, category: place.category, type: place.type },
    });
  }
  return dedupeResults(out).slice(0, limit);
}

export function dedupeResults(items: SearchResult[]) {
  const seen = new Set<string>();
  return items.filter((item) => { const d = domain(item.url); if (!d || seen.has(d)) return false; seen.add(d); return true; });
}

export async function fetchPages(website: string) {
  const safeWebsite = await assertPublicDestination(website);
  const origin = safeWebsite.origin;
  const urls = [safeWebsite.toString(), "/contact", "/kontakt", "/impressum", "/about-us", "/ueber-uns"].map((x, i) => i === 0 ? x : new URL(x, origin).toString());
  const pages: { url: string; title: string; html: string; text: string }[] = [];
  for (const url of urls) {
    if (pages.length >= 3) break;
    try {
      const res = await fetchPublicPage(url, { headers: { Accept: "text/html,application/xhtml+xml,text/plain;q=0.9", "Accept-Language": "en-US,en;q=0.8,de;q=0.7" } });
      if (!res.ok || !/text\/html|text\/plain|xhtml/i.test(res.headers.get("content-type") || "")) continue;
      const finalUrl = safeUrl(res.url);
      if (!finalUrl || !isPublicUrl(finalUrl)) continue;
      const html = (await res.text()).slice(0, 400000);
      if (!pages.some((x) => x.url === finalUrl)) pages.push({ url: finalUrl, title: strip(tag(html, "title")), html, text: strip(html).slice(0, 80000) });
    } catch {}
  }
  if (!pages.length) throw new Error("No readable public pages");
  return pages;
}

export async function knownRecords(db: any) {
  const [a, b] = await Promise.all([
    db.from("lead_candidates").select("id,website_domain,email,website,source_url").limit(5000),
    db.from("b2b_leads").select("id,website_domain,email,website").limit(5000),
  ]);
  const domains = new Map<string, string>(), emails = new Map<string, string>();
  for (const row of [...(a.data || []), ...(b.data || [])]) {
    const d = domain(row.website_domain || row.website || row.source_url), e = validEmail(row.email);
    if (d) domains.set(d, row.id); if (e) emails.set(e, row.id);
  }
  return { domains, emails };
}

export async function refreshCampaign(db: any, id: string) {
  const result = await db.from("lead_candidates").select("verification_status").eq("campaign_id", id), rows = result.data || [];
  const count = (status: string) => rows.filter((x: any) => x.verification_status === status).length;
  await db.from("lead_campaigns").update({
    discovered_count: rows.length,
    reviewed_count: count("needs_review") + count("verified") + count("rejected") + count("imported"),
    verified_count: count("verified") + count("imported"),
    imported_count: count("imported"),
  }).eq("id", id);
}

export function companyName(title: string, d: string | null) {
  const text = strip(title), generic = /\b(wholesale|manufacturer|supplier|official site|homepage|lederhosen|dirndl|trachten)\b/i;
  const parts = text.split(/\s+[|–—]\s+/).map((x) => x.trim()).filter((x) => x.length >= 2 && x.length <= 120);
  const selected = parts.find((x) => !generic.test(x)) || parts[parts.length - 1] || text;
  if (selected && selected.length <= 160 && !generic.test(selected)) return selected;
  return d ? d.split(".")[0].replace(/[-_]+/g, " ").replace(/\b\w/g, (x) => x.toUpperCase()) : selected || "Unknown company";
}

export function inferCountry(d: string | null, market: string) {
  if (d?.endsWith(".de")) return "Germany";
  if (d?.endsWith(".at")) return "Austria";
  if (d?.endsWith(".ch")) return "Switzerland";
  if (d?.endsWith(".nl")) return "Netherlands";
  const match = market.match(/Germany|Austria|Switzerland|Netherlands|Deutschland|Österreich|Schweiz/i)?.[0];
  return match ? ({ deutschland: "Germany", österreich: "Austria", schweiz: "Switzerland" } as Record<string, string>)[match.toLowerCase()] || match : null;
}
