type JsonRecord = Record<string, unknown>;

type GatewayResponse = {
  ok?: boolean;
  reference?: string;
  error?: string;
};

const INQUIRY_REST_PATH = "/rest/v1/inquiries";
const INQUIRY_GATEWAY_PATH = "/functions/v1/public-lead-gateway";

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof input === "string") return new URL(input);
  return new URL(input.url);
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function mergedHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
  );
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers;
}

async function readJsonBody(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  if (typeof init?.body === "string") return JSON.parse(init.body);
  if (typeof Request !== "undefined" && input instanceof Request) {
    const text = await input.clone().text();
    return text ? JSON.parse(text) : null;
  }
  return null;
}

function postgrestError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      message,
      details: null,
      hint: "Retry the inquiry or continue through WhatsApp.",
      code: "IRHA_INQUIRY_GATEWAY",
    }),
    {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

/**
 * Compatibility transport for the currently deployed inquiry wizard.
 *
 * The page still creates a PostgREST insert, while the production security
 * contract requires public submissions to pass through public-lead-gateway.
 * This fetch adapter reroutes only source="inquiry-wizard" inserts. Every
 * other Supabase request is passed through unchanged.
 */
export function createIrhaFetch(supabaseUrl: string): typeof fetch {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  const expectedOrigin = new URL(supabaseUrl).origin;

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);

    if (
      method !== "POST" ||
      url.origin !== expectedOrigin ||
      url.pathname !== INQUIRY_REST_PATH
    ) {
      return nativeFetch(input, init);
    }

    let parsed: unknown;
    try {
      parsed = await readJsonBody(input, init);
    } catch {
      return nativeFetch(input, init);
    }

    const row = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!isRecord(row) || row.source !== "inquiry-wizard") {
      return nativeFetch(input, init);
    }

    const leadContext = isRecord(row.lead_context) ? row.lead_context : {};
    const files = Array.isArray(leadContext.uploaded_files) ? leadContext.uploaded_files : [];
    const headers = mergedHeaders(input, init);
    headers.set("content-type", "application/json");
    headers.delete("prefer");

    let gatewayResponse: Response;
    try {
      gatewayResponse = await nativeFetch(`${expectedOrigin}${INQUIRY_GATEWAY_PATH}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "submit_inquiry",
          payload: {
            ...row,
            kind: "inquiry",
            files,
            form_started_at: leadContext.form_started_at,
            consent: isRecord(leadContext.consent) && leadContext.consent.given === true,
            website: "",
          },
        }),
      });
    } catch {
      return postgrestError("Secure inquiry service is temporarily unavailable.", 503);
    }

    const responseText = await gatewayResponse.text();
    let gatewayData: GatewayResponse = {};
    try {
      gatewayData = responseText ? (JSON.parse(responseText) as GatewayResponse) : {};
    } catch {
      gatewayData = {};
    }

    if (!gatewayResponse.ok || !gatewayData.ok) {
      const status = gatewayResponse.ok ? 500 : gatewayResponse.status;
      return postgrestError(
        gatewayData.error || "Secure inquiry request could not be saved.",
        status,
      );
    }

    return new Response(null, {
      status: 201,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "preference-applied": "return=minimal",
        "x-irha-inquiry-reference": gatewayData.reference || String(row.inquiry_ref || "received"),
      },
    });
  };
}
