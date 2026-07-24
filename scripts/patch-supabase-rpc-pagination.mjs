const nativeFetch = globalThis.fetch.bind(globalThis);
const RPC_PATH = "/rest/v1/rpc/get_public_legacy_redirects";
const MAX_PAGES = 100;
const PREVIEW_PROPAGATION_RETRIES = 6;
const CRAWL_ORIGIN = (process.env.CRAWL_ORIGIN || "").replace(/\/$/, "");
const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || "").replace(/\/$/, "");
const PREVIEW_ORIGIN = CRAWL_ORIGIN && CRAWL_ORIGIN !== CANONICAL_ORIGIN
  ? new URL(CRAWL_ORIGIN).origin
  : "";
const seenFingerprints = new Map();

function inputUrl(input) {
  if (typeof input === "string") return new URL(input);
  if (input instanceof URL) return new URL(input.toString());
  if (input instanceof Request) return new URL(input.url);
  return null;
}

function requestHeaders(input, init) {
  if (init?.headers) return new Headers(init.headers);
  if (input instanceof Request) return new Headers(input.headers);
  return new Headers();
}

function requestMethod(input, init) {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function pageRange(headers) {
  const value = headers.get("range");
  const match = value?.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  const offset = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || end < offset) {
    throw new Error(`Invalid Supabase RPC range: ${value}`);
  }
  return { offset, limit: end - offset + 1 };
}

function fingerprintPage(page) {
  if (!Array.isArray(page) || page.length === 0) return `empty:${page?.length ?? "invalid"}`;
  const first = page[0];
  const last = page.at(-1);
  return JSON.stringify([
    page.length,
    first?.from_path ?? null,
    first?.to_path ?? null,
    last?.from_path ?? null,
    last?.to_path ?? null,
  ]);
}

async function fetchWithPreviewPropagationRetry(input, init) {
  const url = inputUrl(input);
  const method = requestMethod(input, init);
  const retryablePreviewRequest = Boolean(
    url
      && PREVIEW_ORIGIN
      && url.origin === PREVIEW_ORIGIN
      && (method === "GET" || method === "HEAD"),
  );
  const attempts = retryablePreviewRequest ? PREVIEW_PROPAGATION_RETRIES : 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await nativeFetch(input, init);
    if (!retryablePreviewRequest || response.status !== 404 || attempt === attempts) return response;

    const body = await response.clone().text();
    if (!/deployment\s+not\s+found/i.test(body)) return response;

    await new Promise((resolve) => setTimeout(resolve, Math.min(attempt * 1500, 6000)));
  }

  throw new Error("Preview propagation retry loop ended unexpectedly");
}

globalThis.fetch = async (input, init) => {
  const url = inputUrl(input);
  if (!url || url.pathname !== RPC_PATH) return fetchWithPreviewPropagationRetry(input, init);

  const headers = requestHeaders(input, init);
  const range = pageRange(headers);
  if (!range) return fetchWithPreviewPropagationRetry(input, init);

  const pageNumber = Math.floor(range.offset / range.limit);
  if (pageNumber >= MAX_PAGES) {
    throw new Error(`Supabase redirect RPC pagination exceeded ${MAX_PAGES} pages at offset ${range.offset}`);
  }

  url.searchParams.set("limit", String(range.limit));
  url.searchParams.set("offset", String(range.offset));
  headers.delete("range");

  const requestInput = input instanceof Request ? new Request(url, input) : url;
  const response = await fetchWithPreviewPropagationRetry(requestInput, { ...init, headers });
  if (!response.ok) return response;

  const page = await response.clone().json();
  if (!Array.isArray(page)) throw new Error("Supabase redirect RPC returned a non-array page");
  const fingerprint = fingerprintPage(page);
  const previousOffset = seenFingerprints.get(fingerprint);
  if (previousOffset !== undefined && previousOffset !== range.offset) {
    throw new Error(`Supabase redirect RPC repeated page data at offsets ${previousOffset} and ${range.offset}`);
  }
  seenFingerprints.set(fingerprint, range.offset);

  return response;
};
