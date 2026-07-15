import { afterEach, describe, expect, it, vi } from "vitest";
import { createIrhaFetch } from "../inquiryTransportFetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("inquiry submission transport", () => {
  it("routes the public inquiry wizard through public-lead-gateway", async () => {
    const nativeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://project.supabase.co/functions/v1/public-lead-gateway");
      expect(init?.method).toBe("POST");

      const body = JSON.parse(String(init?.body)) as {
        action: string;
        payload: Record<string, unknown>;
      };
      expect(body.action).toBe("submit_inquiry");
      expect(body.payload.source).toBe("inquiry-wizard");
      expect(body.payload.kind).toBe("inquiry");
      expect(body.payload.files).toEqual([
        { path: "requests/inquiry/test.pdf", name: "test.pdf", size: 120, mime: "application/pdf" },
      ]);

      return new Response(JSON.stringify({ ok: true, reference: "IRQ-TEST-123456" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = nativeFetch as unknown as typeof fetch;

    const secureFetch = createIrhaFetch("https://project.supabase.co");
    const response = await secureFetch("https://project.supabase.co/rest/v1/inquiries", {
      method: "POST",
      headers: {
        apikey: "public-key",
        authorization: "Bearer public-key",
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({
        name: "Buyer",
        email: "buyer@example.com",
        company: "Buyer Company",
        country: "Germany",
        phone: "+4912345678",
        source: "inquiry-wizard",
        intent: "rfq",
        inquiry_ref: "IRQ-TEST-123456",
        lead_context: {
          uploaded_files: [
            { path: "requests/inquiry/test.pdf", name: "test.pdf", size: 120, mime: "application/pdf" },
          ],
        },
      }),
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("x-irha-inquiry-reference")).toBe("IRQ-TEST-123456");
    expect(nativeFetch).toHaveBeenCalledTimes(1);
  });

  it("leaves every non-wizard Supabase request unchanged", async () => {
    const nativeFetch = vi.fn(async () => new Response("[]", { status: 200 }));
    globalThis.fetch = nativeFetch as unknown as typeof fetch;

    const secureFetch = createIrhaFetch("https://project.supabase.co");
    const response = await secureFetch("https://project.supabase.co/rest/v1/categories?select=slug", {
      method: "GET",
    });

    expect(response.status).toBe(200);
    expect(nativeFetch).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/categories?select=slug",
      { method: "GET" },
    );
  });

  it("returns a buyer-safe PostgREST error when the gateway rejects the request", async () => {
    const nativeFetch = vi.fn(async () => new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { "content-type": "application/json" } },
    ));
    globalThis.fetch = nativeFetch as unknown as typeof fetch;

    const secureFetch = createIrhaFetch("https://project.supabase.co");
    const response = await secureFetch("https://project.supabase.co/rest/v1/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "inquiry-wizard",
        inquiry_ref: "IRQ-TEST-123456",
        lead_context: {},
      }),
    });
    const body = await response.json() as { message: string; code: string };

    expect(response.status).toBe(429);
    expect(body.message).toBe("Too many requests. Please try again later.");
    expect(body.code).toBe("IRHA_INQUIRY_GATEWAY");
  });
});
