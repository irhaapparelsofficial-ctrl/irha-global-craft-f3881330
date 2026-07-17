import { readFileSync, writeFileSync } from "node:fs";

const path = "supabase/functions/generate-mockup/index.ts";
let source = readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) {
    throw new Error(`${label}: expected exactly one source block`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  "wildcard CORS block",
  `const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  ...securityHeaders,
};`,
  `const SITE_URL = "https://irhaapparels.com";

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !local) return false;
    return url.hostname === "irhaapparels.com" ||
      url.hostname === "www.irhaapparels.com" ||
      local ||
      url.hostname.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : SITE_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...securityHeaders,
  };
}`,
);

replaceOnce(
  "JSON response signature",
  `function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,`,
  `function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,`,
);

const handlerMarker = "Deno.serve(async (req: Request) => {";
const markerIndex = source.indexOf(handlerMarker);
if (markerIndex < 0 || markerIndex !== source.lastIndexOf(handlerMarker)) {
  throw new Error("handler: expected exactly one Deno.serve marker");
}

const prefix = source.slice(0, markerIndex);
let handler = source.slice(markerIndex);
const oldHandlerStart = `Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);`;
const newHandlerStart = `Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  const respond = (body: Record<string, unknown>, status = 200) => jsonResponse(body, status, headers);

  if (origin && !isAllowedOrigin(origin)) return respond({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);`;
if (!handler.startsWith(oldHandlerStart)) {
  throw new Error("handler start does not match the reviewed source");
}
handler = handler.replace(oldHandlerStart, newHandlerStart);
handler = handler.replaceAll("jsonResponse(", "respond(");
source = prefix + handler;

if (source.includes('"Access-Control-Allow-Origin": "*"')) {
  throw new Error("wildcard CORS remains after patch");
}
if (!source.includes('return respond({ error: "origin_not_allowed" }, 403)')) {
  throw new Error("origin rejection guard missing after patch");
}
if (!source.includes('"Vary": "Origin"')) {
  throw new Error("Vary: Origin missing after patch");
}
if (source.includes("headers: corsHeaders")) {
  throw new Error("static CORS header reference remains after patch");
}

writeFileSync(path, source);
