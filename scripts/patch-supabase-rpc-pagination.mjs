const nativeFetch = globalThis.fetch.bind(globalThis);
const RPC_PATH = "/rest/v1/rpc/get_public_legacy_redirects";
const MAX_PAGES = 100;
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

globalThis.fetch = async (input, init) => {
  const url = inputUrl(input);
  if (!url || url.pathname !== RPC_PATH) return nativeFetch(input, init);

  const headers = requestHeaders(input, init);
  const range = pageRange(headers);
  if (!range) return nativeFetch(input, init);

  const pageNumber = Math.floor(range.offset / range.limit);
  if (pageNumber >= MAX_PAGES) {
    throw new Error(`Supabase redirect RPC pagination exceeded ${MAX_PAGES} pages at offset ${range.offset}`);
  }

  url.searchParams.set("limit", String(range.limit));
  url.searchParams.set("offset", String(range.offset));
  headers.delete("range");

  const requestInput = input instanceof Request ? new Request(url, input) : url;
  const response = await nativeFetch(requestInput, { ...init, headers });
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
