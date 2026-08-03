const RELEASE_PROBE_PARAM = "__irha_release_probe";

function noStoreHeaders(sourceHeaders = new Headers()) {
  const headers = new Headers(sourceHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0, must-revalidate");
  headers.set("cdn-cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.delete("etag");
  headers.delete("age");
  headers.delete("cf-cache-status");
  return headers;
}

export function releaseIdentityAssetUrl(requestUrl, nonce = crypto.randomUUID()) {
  const url = new URL(requestUrl);
  url.pathname = "/build.json";
  url.searchParams.set(RELEASE_PROBE_PARAM, nonce);
  return url;
}

async function fetchCurrentReleaseIdentity(context) {
  const assetUrl = releaseIdentityAssetUrl(context.request.url);
  const assetRequest = new Request(assetUrl, {
    method: "GET",
    headers: {
      accept: "application/json,text/plain,*/*",
      "cache-control": "no-cache",
    },
  });
  const asset = await context.env.ASSETS.fetch(assetRequest);
  const headers = noStoreHeaders(asset.headers);

  if (context.request.method === "HEAD") {
    return new Response(null, { status: asset.status, headers });
  }

  return new Response(asset.body, { status: asset.status, headers });
}

export async function onRequestGet(context) {
  return fetchCurrentReleaseIdentity(context);
}

export async function onRequestHead(context) {
  return fetchCurrentReleaseIdentity(context);
}
