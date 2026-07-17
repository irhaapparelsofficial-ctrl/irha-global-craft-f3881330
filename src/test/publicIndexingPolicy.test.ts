import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

async function loadModule(path: string) {
  const url = pathToFileURL(resolve(process.cwd(), path)).href;
  return import(`${url}?test=${Date.now()}-${Math.random()}`);
}

function htmlResponse(robots = "noindex,nofollow") {
  return new Response(
    `<!doctype html><html><head><meta name="robots" content="${robots}"></head><body>Irha</body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

describe("production public indexing policy", () => {
  it("normalizes canonical public HTML to index,follow and removes an inherited global noindex header", async () => {
    const { onRequest } = await loadModule("functions/_middleware.js");
    const response = await onRequest({
      request: new Request("https://irhaapparels.com/products"),
      next: async () => htmlResponse(),
    });

    expect(response.headers.get("X-Robots-Tag")).toBeNull();
    expect(await response.text()).toContain(
      '<meta name="robots" content="index,follow,max-image-preview:large" />',
    );
  });

  it.each([
    "https://irhaapparels.com/studio",
    "https://irhaapparels.com/intl/de/products/bavarian-trachten-wear",
  ])("keeps draft or utility route noindex: %s", async (url) => {
    const { onRequest } = await loadModule("functions/_middleware.js");
    const response = await onRequest({
      request: new Request(url),
      next: async () => htmlResponse("index,follow"),
    });

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex,follow");
    expect(await response.text()).toContain('<meta name="robots" content="noindex,follow" />');
  });

  it("keeps private routes noindex at the response-header layer", async () => {
    const { onRequest } = await loadModule("functions/_middleware.js");
    const response = await onRequest({
      request: new Request("https://irhaapparels.com/admin"),
      next: async () => htmlResponse("index,follow"),
    });

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex,follow");
  });

  it("sanitizes the runtime sitemap to canonical indexable URLs only", async () => {
    const { onRequestGet } = await loadModule("functions/sitemap.xml.js");
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://irhaapparels.com/</loc></url>
  <url><loc>https://irhaapparels.com/products</loc></url>
  <url><loc>https://irhaapparels.com/studio</loc></url>
  <url><loc>https://irhaapparels.com/intl/de/products/sportswear</loc></url>
  <url><loc>https://www.irhaapparels.com/products</loc></url>
  <url><loc>https://irhaapparels.com/products?draft=true</loc></url>
</urlset>`;

    const response = await onRequestGet({
      request: new Request("https://irhaapparels.com/sitemap.xml"),
      env: {
        ASSETS: {
          fetch: async () => new Response(source, { status: 200 }),
        },
      },
    });
    const xml = await response.text();

    expect(xml).toContain("<loc>https://irhaapparels.com/</loc>");
    expect(xml).toContain("<loc>https://irhaapparels.com/products</loc>");
    expect(xml).not.toContain("/studio");
    expect(xml).not.toContain("/intl/");
    expect(xml).not.toContain("www.irhaapparels.com");
    expect(xml).not.toContain("?draft=true");
  });
});
