import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type PagesContext = {
  request: Request;
  next: () => Promise<Response>;
};

type PagesMiddleware = {
  onRequest: (context: PagesContext) => Promise<Response>;
};

const source = readFileSync(resolve(process.cwd(), "functions/_middleware.js"), "utf8");
let middleware: PagesMiddleware;

beforeAll(async () => {
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  middleware = await import(dataUrl) as PagesMiddleware;
});

describe("Cloudflare Pages canonical host middleware", () => {
  it("keeps advanced-mode _worker.js absent so Pages Functions remain active", () => {
    expect(() => readFileSync(resolve(process.cwd(), "public/_worker.js"), "utf8")).toThrow();
    expect(source).toContain('const WWW_HOST = "www.irhaapparels.com"');
  });

  it("redirects www GET requests to the HTTPS apex while preserving path and query", async () => {
    const next = vi.fn(async () => new Response("asset"));
    const response = await middleware.onRequest({
      request: new Request("https://www.irhaapparels.com/products/sportswear?source=audit"),
      next,
    });

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://irhaapparels.com/products/sportswear?source=audit");
    expect(response.headers.get("x-irha-canonical-redirect")).toBe("www-to-apex");
    expect(next).not.toHaveBeenCalled();
  });

  it("uses 308 for non-GET requests so method and body semantics are preserved", async () => {
    const next = vi.fn(async () => new Response("asset"));
    const response = await middleware.onRequest({
      request: new Request("https://www.irhaapparels.com/inquiry?intent=rfq", {
        method: "POST",
        body: "test=true",
      }),
      next,
    });

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://irhaapparels.com/inquiry?intent=rfq");
    expect(next).not.toHaveBeenCalled();
  });

  it("passes apex traffic to the existing Pages function and asset pipeline", async () => {
    const next = vi.fn(async () => new Response("existing-site", { status: 200, headers: { "Content-Type": "text/plain" } }));
    const response = await middleware.onRequest({
      request: new Request("https://irhaapparels.com/admin/live-chat"),
      next,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("existing-site");
    expect(next).toHaveBeenCalledOnce();
  });
});
