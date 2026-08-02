import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/verify-official-brand-live.yml"),
  "utf8",
);

const extractRunBlock = (stepName: string) => {
  const stepMarker = `      - name: ${stepName}`;
  const stepStart = workflow.indexOf(stepMarker);
  expect(stepStart).toBeGreaterThan(-1);

  const runMarker = "        run: |\n";
  const runStart = workflow.indexOf(runMarker, stepStart);
  expect(runStart).toBeGreaterThan(stepStart);

  const contentStart = runStart + runMarker.length;
  const nextStep = workflow.indexOf("\n      - name:", contentStart);
  return workflow
    .slice(contentStart, nextStep === -1 ? undefined : nextStep)
    .split("\n")
    .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
    .join("\n");
};

const between = (text: string, start: string, end: string) => {
  const startIndex = text.indexOf(start);
  expect(startIndex).toBeGreaterThan(-1);
  const endIndex = text.indexOf(end, startIndex);
  expect(endIndex).toBeGreaterThan(startIndex);
  return text.slice(startIndex, endIndex);
};

const runBash = (script: string, args: string[] = [], cwd?: string) =>
  spawnSync("bash", ["-c", script, "test", ...args], {
    cwd,
    encoding: "utf8",
  });

describe("IA-BRAND-LIVE-CLOSURE-E001 verifier contract", () => {
  const sourceScript = extractRunBlock("Resolve exact search-verified production SHA");
  const brandScript = extractRunBlock("Verify official logo and favicon on production");
  const routeScript = extractRunBlock("Verify canonical buyer routes on production");

  it("keeps changed shell blocks syntactically valid", () => {
    for (const script of [sourceScript, brandScript, routeScript]) {
      const result = spawnSync("bash", ["-n", "-c", script], { encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
    }
  });

  it("rejects stale Pages identity and a mismatched dispatch SHA", () => {
    const fn = between(sourceScript, "exact_current_source() {", "\n\nfor attempt");
    const same = "a".repeat(40);
    const stale = "b".repeat(40);

    expect(runBash(`${fn}\nexact_current_source "$1" "$2" "$3"`, [same, same, same]).status).toBe(0);
    expect(runBash(`${fn}\nexact_current_source "$1" "$2" "$3"`, [stale, same, stale]).status).not.toBe(0);
    expect(runBash(`${fn}\nexact_current_source "$1" "$2" "$3"`, [same, same, stale]).status).not.toBe(0);

    expect(sourceScript).toContain('.source_branch == "main"');
    expect(sourceScript).toContain('.expected_origin == "https://irhaapparels.com"');
    expect(sourceScript).toContain('.build_fingerprint | type == "string"');
    expect(sourceScript).toContain("Irha Search Discovery");
  });

  it("classifies only explicit HTTP 403 Cloudflare challenges", () => {
    const fn = between(brandScript, "cloudflare_challenge() {", "\n\nchallenge_evidence()");
    const dir = mkdtempSync(join(tmpdir(), "brand-live-challenge-"));

    try {
      const headers = join(dir, "headers.txt");
      const body = join(dir, "body.txt");

      writeFileSync(headers, "server: cloudflare\ncf-mitigated: challenge\n");
      writeFileSync(body, "blocked");
      expect(runBash(`${fn}\ncloudflare_challenge "$1" "$2" "$3"`, ["403", headers, body]).status).toBe(0);

      writeFileSync(headers, "server: cloudflare\n");
      writeFileSync(body, "<title>Just a moment...</title>");
      expect(runBash(`${fn}\ncloudflare_challenge "$1" "$2" "$3"`, ["403", headers, body]).status).toBe(0);

      writeFileSync(headers, "server: cloudflare\n");
      writeFileSync(body, "Forbidden");
      expect(runBash(`${fn}\ncloudflare_challenge "$1" "$2" "$3"`, ["403", headers, body]).status).not.toBe(0);

      writeFileSync(headers, "server: cloudflare\ncf-mitigated: challenge\n");
      writeFileSync(body, "<title>Just a moment...</title>");
      expect(runBash(`${fn}\ncloudflare_challenge "$1" "$2" "$3"`, ["200", headers, body]).status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("uses exact Pages evidence only for an explicitly challenged apex observation", () => {
    const classifier = between(brandScript, "cloudflare_challenge() {", "\n\nchallenge_evidence()");
    const evidence = between(brandScript, "challenge_evidence() {", "\n\npng_dimensions()");
    const resolver = between(brandScript, "resolve_observation() {", "\n\nbrand_payload_contract()");
    const dir = mkdtempSync(join(tmpdir(), "brand-live-fallback-"));

    try {
      const headers = join(dir, "headers.txt");
      const body = join(dir, "body.txt");
      const fallback = join(dir, "fallback.txt");
      const effective = join(dir, "effective.txt");

      writeFileSync(headers, "server: cloudflare\ncf-mitigated: challenge\ncf-ray: test-ray\n");
      writeFileSync(body, "<title>Just a moment...</title>");
      writeFileSync(fallback, "exact-pages-brand");

      const challengeResult = runBash(
        `${classifier}\n${evidence}\n${resolver}\nlabel=apex\nchallenge_seen=false\nchallenged_routes=()\nresolve_observation "$1" "$2" "$3" "$4" "$5" "/manifest.webmanifest" true\ntest "$challenge_seen" = true\ngrep -Fx "exact-pages-brand" "$5" >/dev/null`,
        ["403", headers, body, fallback, effective],
      );
      expect(challengeResult.status, challengeResult.stderr).toBe(0);

      writeFileSync(headers, "server: cloudflare\n");
      writeFileSync(body, "ordinary forbidden");
      const ordinary403 = runBash(
        `${classifier}\n${evidence}\n${resolver}\nlabel=apex\nchallenge_seen=false\nchallenged_routes=()\nresolve_observation "$1" "$2" "$3" "$4" "$5" "/" true`,
        ["403", headers, body, fallback, effective],
      );
      expect(ordinary403.status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts the exact brand payload and rejects missing/wrong brand or master hash", () => {
    const contract = between(brandScript, "brand_payload_contract() {", "\n\nverify_origin()");
    const dir = mkdtempSync(join(tmpdir(), "brand-live-payload-"));
    const prefix = join(dir, "effective");
    const expected = "32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87";

    try {
      for (const suffix of ["master.png", "runtime.png", "icon192.png", "icon512.png", "apple.png"]) {
        writeFileSync(`${prefix}-${suffix}`, "fixture");
      }
      writeFileSync(`${prefix}-favicon.svg`, `data-master-sha256="${expected}" data:image/png;base64,AAA`);
      writeFileSync(`${prefix}-favicon.ico`, `fixture-${expected}`);
      writeFileSync(
        `${prefix}-provenance.json`,
        JSON.stringify({
          master: { sha256: expected, width: 1024, height: 1024 },
          generation: { crop: false, stretch: false },
        }),
      );
      writeFileSync(
        `${prefix}-manifest.json`,
        JSON.stringify({
          icons: [{ src: "/icon-192x192.png" }, { src: "/icon-512x512.png" }],
        }),
      );
      writeFileSync(`${prefix}-home.html`, "/brand/irha-apparels-official-runtime-512.png");

      const wrapper = `${contract}\npng_dimensions() { return 0; }\nbrand_payload_contract "$1" "$2" "$3"`;
      expect(runBash(wrapper, [prefix, expected, expected]).status).toBe(0);
      expect(runBash(wrapper, [prefix, "0".repeat(64), expected]).status).not.toBe(0);

      writeFileSync(`${prefix}-home.html`, "wrong-brand");
      expect(runBash(wrapper, [prefix, expected, expected]).status).not.toBe(0);

      rmSync(`${prefix}-manifest.json`);
      expect(runBash(wrapper, [prefix, expected, expected]).status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps buyer-route verification strict while allowing only evidenced apex observer limitations", () => {
    expect(routeScript).toContain('verify_route_origin "$pages_origin" pages false ""');
    expect(routeScript).toContain('verify_route_origin "$apex_origin" apex true "$pages_valid_path"');
    expect(routeScript).toContain('status="$1"');
    expect(routeScript).toContain('[ "$status" = "403" ] || return 1');
    expect(routeScript).toContain("Buyer route non-challenge failure");
    expect(routeScript).toContain(".productCount == 254");
    expect(routeScript).toContain('[ "$legacy_status" = "301" ]');
    expect(routeScript).toContain('[ "$missing_status" = "404" ]');
    expect(routeScript).toContain('[ "$missing_marker" = "not-found" ]');
  });

  it("records challenge-limited success without weakening the official master lock", () => {
    expect(workflow).toContain("32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87");
    expect(workflow).toContain("Independent public/browser verification remains required whenever an apex challenge is recorded.");
    expect(workflow).toContain("Exact brand/Pages route contract verified; apex GitHub observer challenge-classified");
  });
});
