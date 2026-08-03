import { describe, expect, it } from "vitest";
import { classifyBuildIdentityResponse } from "../../scripts/ci/release-identity-response.mjs";
import { onRequestGet, releaseIdentityAssetUrl } from "../../functions/build.json/index.js";

const expectedSha = "db31597b6afece525e1212412b4bbc029e554aa5";
const expectedFingerprint = "0cd158c2bb23e1d4b6c02881e11ac130385b60b5d07cdb1e5434794e8317e4f1";
const staleSha = "078ceb60d423b18bb31101e1cd5d141dc9f9d136";
const staleFingerprint = "a5015ddb9e8d9f16f97f6c073157c56f9b306eacb88eaf31879e254755f439ce";

const currentBody = JSON.stringify({
  source_commit: expectedSha,
  source_identity_state: "verified",
  build_fingerprint: expectedFingerprint,
});
const staleBody = JSON.stringify({
  source_commit: staleSha,
  source_identity_state: "verified",
  build_fingerprint: staleFingerprint,
});

const classify = (overrides: Record<string, unknown> = {}) =>
  classifyBuildIdentityResponse({
    status: 200,
    body: currentBody,
    headers: "content-type: application/json\n",
    expectedSha,
    expectedFingerprint,
    allowChallenge: false,
    ...overrides,
  });

describe("IA-CACHE-E001-CLOSURE-02 exact release identity", () => {
  it("passes the exact current release", () => {
    expect(classify()).toMatchObject({ ok: true, classification: "exact-release" });
  });

  it.each([
    ["plain stale HTTP-200", "/build.json"],
    ["query-string stale HTTP-200", "/build.json?release_check=probe"],
    ["browser-UA stale HTTP-200", "/build.json"],
  ])("fails %s identity", (_label, _request) => {
    expect(classify({ body: staleBody })).toMatchObject({
      ok: false,
      classification: "stale-or-wrong-release",
      reason: "wrong-sha",
    });
  });

  it("fails a wrong SHA even when the fingerprint is current", () => {
    const body = JSON.stringify({
      source_commit: staleSha,
      source_identity_state: "verified",
      build_fingerprint: expectedFingerprint,
    });
    expect(classify({ body })).toMatchObject({ ok: false, reason: "wrong-sha" });
  });

  it("fails a wrong fingerprint even when the SHA is current", () => {
    const body = JSON.stringify({
      source_commit: expectedSha,
      source_identity_state: "verified",
      build_fingerprint: staleFingerprint,
    });
    expect(classify({ body })).toMatchObject({ ok: false, reason: "wrong-fingerprint" });
  });

  it("allows only an explicit Cloudflare challenge when the caller permits observer limitation", () => {
    expect(classify({
      status: 403,
      body: "Just a moment...",
      headers: "server: cloudflare\ncf-mitigated: challenge\n",
      allowChallenge: true,
    })).toMatchObject({ ok: true, classification: "challenge-limited" });
  });

  it("keeps an ordinary 403 as a hard failure", () => {
    expect(classify({ status: 403, body: "Forbidden", headers: "server: cloudflare\n", allowChallenge: true }))
      .toMatchObject({ ok: false, classification: "http-failure", reason: "status-403" });
  });

  it("forces every Pages release-marker asset fetch onto a unique query key", async () => {
    const requestedUrls: string[] = [];
    const context = {
      request: new Request("https://irha-apparels.pages.dev/build.json", {
        headers: { "user-agent": "Mozilla/5.0 Chrome/140.0" },
      }),
      env: {
        ASSETS: {
          fetch: async (request: Request) => {
            const url = new URL(request.url);
            requestedUrls.push(url.toString());
            const body = url.searchParams.has("__irha_release_probe") ? currentBody : staleBody;
            return new Response(body, {
              status: 200,
              headers: {
                "content-type": "application/json",
                etag: '"historical-static-object"',
              },
            });
          },
        },
      },
    };

    const response = await onRequestGet(context as never);
    const payload = await response.json() as { source_commit: string; build_fingerprint: string };

    expect(requestedUrls).toHaveLength(1);
    expect(new URL(requestedUrls[0]).searchParams.has("__irha_release_probe")).toBe(true);
    expect(payload.source_commit).toBe(expectedSha);
    expect(payload.build_fingerprint).toBe(expectedFingerprint);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0, must-revalidate");
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    expect(response.headers.has("etag")).toBe(false);
  });

  it("preserves caller query parameters while adding the internal release probe", () => {
    const url = releaseIdentityAssetUrl(
      "https://irha-apparels.pages.dev/build.json?release_check=test",
      "fixed-probe",
    );
    expect(url.searchParams.get("release_check")).toBe("test");
    expect(url.searchParams.get("__irha_release_probe")).toBe("fixed-probe");
  });
});
