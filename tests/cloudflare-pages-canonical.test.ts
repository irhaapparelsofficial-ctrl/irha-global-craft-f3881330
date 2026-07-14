import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type AssetEnv = {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
};

type PagesWorker = {
  fetch: (request: Request, env: AssetEnv) => Promise<Response>;
};

const source = readFileSync(resolve(process.cwd(), "public/_worker.js"), "utf8");
let worker: PagesWorker;

beforeAll(async () => {
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  const module = await import(dataUrl) as { default: PagesWorker };
  worker = module.default;
});

describe("Cloudflare Pages canonical host worker", () => {
  it("redirects www GET requests to the HTTPS apex while preserving path and query", async () => {
    const assetFetch = vi.fn(async () => new Response("asset"));
    const response = await worker.fetch(
      new Request("https://www.irhaapparels.com/products/sportswear?source=audit"),
      { ASSETS: { fetch: assetFetch } },
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://irhaapparels.com/products/sportswear?source=audit");
    expect(response.headers.get("x-irha-canonical-redirect")).toBe("www-to-apex");
    expect(assetFetch).not.toHaveBeenCalled();
  });

  it("uses 308 for non-GET methods so method and body semantics are preserved", async () => {
    const assetFetch = vi.fn(async () => new Response("asset"));
    const response = await worker.fetch(
      new Request("https://www.irhaapparels.com/inquiry?intent=rfq", {
        method: "POST",
        body: "test=true",
      }),
      { ASSETS: { fetch: assetFetch } },
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://irhaapparels.com/inquiry?intent=rfq");
    expect(assetFetch).not.toHaveBeenCalled();
  });

  it("passes apex traffic to the existing Pages static asset binding", async () => {
    const expected = new Response("existing-site", { status: 200 });
    const assetFetch = vi.fn(async () => expected);
    const request = new Request("https://irhaapparels.com/admin/live-chat");
    const response = await worker.fetch(request, { ASSETS: { fetch: assetFetch } });

    expect(response).toBe(expected);
    expect(assetFetch).toHaveBeenCalledOnce();
    expect(assetFetch).toHaveBeenCalledWith(request);
  });

  it("fails closed without caching if the Pages asset binding is unavailable", async () => {
    const response = await worker.fetch(new Request("https://irhaapparels.com/"), {});
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
