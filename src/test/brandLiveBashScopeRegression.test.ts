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
  const marker = `      - name: ${stepName}`;
  const stepStart = workflow.indexOf(marker);
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

const runBash = (script: string, args: string[] = []) =>
  spawnSync("bash", ["-c", script, "test", ...args], {
    encoding: "utf8",
  });

describe("Brand Live Bash scope regression", () => {
  const brandScript = extractRunBlock("Verify official logo and favicon on production");
  const routeScript = extractRunBlock("Verify canonical buyer routes on production");

  it("does not let sequential observation helpers overwrite caller file-path state", () => {
    const classifier = between(brandScript, "cloudflare_challenge() {", "\n\nchallenge_evidence()");
    const evidence = between(brandScript, "challenge_evidence() {", "\n\npng_dimensions()");
    const resolver = between(brandScript, "resolve_observation() {", "\n\nbrand_payload_contract()");
    const dir = mkdtempSync(join(tmpdir(), "brand-live-scope-"));

    try {
      const headers = join(dir, "headers.txt");
      const first = join(dir, "first.txt");
      const second = join(dir, "second.txt");
      const challenge = join(dir, "challenge.txt");
      const fallback = join(dir, "fallback.txt");

      writeFileSync(headers, "");
      writeFileSync(first, "first");
      writeFileSync(second, "second");
      writeFileSync(challenge, "blocked");
      writeFileSync(fallback, "exact-pages");

      const result = runBash(
        `${classifier}\n${evidence}\n${resolver}\n` +
          `set -euo pipefail\n` +
          `dir="$1"\n` +
          `prefix="$dir/brand-pages"\n` +
          `effective="$prefix-effective"\n` +
          `expected_prefix="$prefix"\n` +
          `expected_effective="$effective"\n` +
          `fallback="$2"\n` +
          `label=pages\n` +
          `challenge_seen=false\n` +
          `challenged_routes=()\n` +
          `resolve_observation 200 "$3" "$4" "$fallback" "$effective-master.png" /master false\n` +
          `test "$prefix" = "$expected_prefix"\n` +
          `test "$effective" = "$expected_effective"\n` +
          `resolve_observation 200 "$3" "$5" "$fallback" "$effective-runtime.png" /runtime false\n` +
          `test "$prefix" = "$expected_prefix"\n` +
          `test "$effective" = "$expected_effective"\n` +
          `grep -Fx first "$expected_effective-master.png" >/dev/null\n` +
          `grep -Fx second "$expected_effective-runtime.png" >/dev/null\n` +
          `printf 'server: cloudflare\\ncf-mitigated: challenge\\n' > "$3"\n` +
          `label=apex\n` +
          `resolve_observation 403 "$3" "$6" "$fallback" "$effective-home.html" / true\n` +
          `test "$prefix" = "$expected_prefix"\n` +
          `test "$effective" = "$expected_effective"\n` +
          `test "$challenge_seen" = true\n` +
          `test "\${challenged_routes[0]}" = /\n` +
          `grep -Fx exact-pages "$expected_effective-home.html" >/dev/null`,
        [dir, fallback, headers, first, second, challenge],
      );

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not let the brand payload contract replace the caller prefix", () => {
    const contract = between(brandScript, "brand_payload_contract() {", "\n\nverify_origin()");
    const dir = mkdtempSync(join(tmpdir(), "brand-live-contract-scope-"));
    const effective = join(dir, "effective");
    const expected = "32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87";

    try {
      for (const suffix of ["master.png", "runtime.png", "icon192.png", "icon512.png", "apple.png"]) {
        writeFileSync(`${effective}-${suffix}`, "fixture");
      }
      writeFileSync(`${effective}-favicon.svg`, `data-master-sha256="${expected}" data:image/png;base64,AAA`);
      writeFileSync(`${effective}-favicon.ico`, expected);
      writeFileSync(
        `${effective}-provenance.json`,
        JSON.stringify({
          master: { sha256: expected, width: 1024, height: 1024 },
          generation: { crop: false, stretch: false },
        }),
      );
      writeFileSync(
        `${effective}-manifest.json`,
        JSON.stringify({ icons: [{ src: "/icon-192x192.png" }, { src: "/icon-512x512.png" }] }),
      );
      writeFileSync(`${effective}-home.html`, "/brand/irha-apparels-official-runtime-512.png");

      const result = runBash(
        `${contract}\n` +
          `png_dimensions() { return 0; }\n` +
          `prefix=caller-prefix\n` +
          `brand_payload_contract "$1" "$2" "$2"\n` +
          `test "$prefix" = caller-prefix`,
        [effective, expected],
      );

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps route helper arguments scoped while preserving challenge-state propagation", () => {
    const classifier = between(routeScript, "cloudflare_challenge() {", "\n\nroute_challenge_or_fail()");
    const helper = between(routeScript, "route_challenge_or_fail() {", "\n\nverify_route_origin()");
    const dir = mkdtempSync(join(tmpdir(), "brand-live-route-scope-"));

    try {
      const headers = join(dir, "headers.txt");
      const body = join(dir, "body.txt");
      writeFileSync(headers, "server: cloudflare\ncf-mitigated: challenge\n");
      writeFileSync(body, "blocked");

      const result = runBash(
        `${classifier}\n${helper}\n` +
          `set -euo pipefail\n` +
          `status=caller-status\nheaders=caller-headers\nbody=caller-body\nroute=caller-route\nallow_challenge=caller-mode\n` +
          `apex_challenged=false\nchallenged_routes=()\n` +
          `route_challenge_or_fail 403 "$1" "$2" /manifest.webmanifest true\n` +
          `test "$status" = caller-status\n` +
          `test "$headers" = caller-headers\n` +
          `test "$body" = caller-body\n` +
          `test "$route" = caller-route\n` +
          `test "$allow_challenge" = caller-mode\n` +
          `test "$apex_challenged" = true\n` +
          `test "\${challenged_routes[0]}" = /manifest.webmanifest`,
        [headers, body],
      );

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps the original challenge and strict Pages contracts intact", () => {
    expect(brandScript).toContain('[ "$status" = "403" ] || return 1');
    expect(brandScript).toContain('verify_origin "$pages_origin" pages false');
    expect(brandScript).toContain('verify_origin "$apex_origin" apex true');
    expect(brandScript).toContain("32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87");
    expect(routeScript).toContain('verify_route_origin "$pages_origin" pages false ""');
    expect(routeScript).toContain('verify_route_origin "$apex_origin" apex true "$pages_valid_path"');
  });
});
