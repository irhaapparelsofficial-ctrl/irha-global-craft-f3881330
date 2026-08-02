from pathlib import Path

ROOT = Path('.')
MASTER_SHA = '32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87'
VERSION = 'ia-brand-master-e001-20260802-32eee79b'
RUNTIME = '/brand/irha-apparels-official-runtime-512.png'
RUNTIME_URL = f'https://irhaapparels.com{RUNTIME}'


def replace(path: str, old: str, new: str, count: int | None = None) -> None:
    target = ROOT / path
    text = target.read_text()
    if old not in text:
        raise SystemExit(f'Missing expected marker in {path}: {old[:120]!r}')
    updated = text.replace(old, new) if count is None else text.replace(old, new, count)
    target.write_text(updated)


replace(
    'scripts/version-official-brand-assets.mjs',
    'const BRAND_VERSION = "ia-brand-visual-e001-20260801";',
    f'const BRAND_VERSION = "{VERSION}";',
)
replace(
    'src/lib/publicIdentity.mjs',
    'logoUrl: "https://irhaapparels.com/irha-brand-mark.svg",',
    f'logoUrl: "{RUNTIME_URL}",',
)
replace(
    'src/lib/siteSettings.ts',
    'logoUrl: "/irha-brand-mark.svg",',
    f'logoUrl: "{RUNTIME}",',
)
replace(
    'src/lib/publicIdentity.test.ts',
    'logo: "https://irhaapparels.com/irha-brand-mark.svg",',
    f'logo: "{RUNTIME_URL}",',
)
replace(
    'src/lib/publicIdentity.test.ts',
    'logoUrl: "/irha-brand-mark.svg",',
    f'logoUrl: "{RUNTIME}",',
)
replace(
    'src/test/siteSettings.test.ts',
    'expect(value.brand.logoUrl).toBe("/irha-brand-mark.svg");',
    f'expect(value.brand.logoUrl).toBe("{RUNTIME}");',
)
replace(
    'scripts/sanitize-unsupported-trust-copy.mjs',
    'src="/irha-brand-mark.svg"',
    f'src="{RUNTIME}"',
)
replace(
    'scripts/verify-built-crawler-shell.mjs',
    'import { readFile, readdir } from "node:fs/promises";',
    'import { createHash } from "node:crypto";\nimport { readFile, readdir, stat } from "node:fs/promises";',
)
replace(
    'scripts/verify-built-crawler-shell.mjs',
    'assert(await readFile(join(DIST, "irha-brand-mark.svg"), "utf8").then((value) => value.includes("Official owner-supplied Irha Apparels")), "Canonical crest asset is missing or unverified");',
    f'''const builtBrandMaster = await readFile(join(DIST, "brand/irha-apparels-official-master.png"));
assert(createHash("sha256").update(builtBrandMaster).digest("hex") === "{MASTER_SHA}", "Built official brand master SHA-256 drift");
assert((await stat(join(DIST, "brand/irha-apparels-official-runtime-512.png"))).size > 0, "Built official runtime crest is missing");''',
)
replace(
    'src/test/proB2BHomepage.test.ts',
    'expect(brandAssets).toContain(\'const OFFICIAL_OWNER_CREST = "/icon-512x512.png"\');',
    f'expect(brandAssets).toContain(\'const OFFICIAL_RUNTIME_CREST = "{RUNTIME}"\');',
)
replace(
    'src/test/proB2BHomepage.test.ts',
    'expect(brandAssets).not.toContain(\'OFFICIAL_OWNER_CREST = "/irha-brand-mark.svg"\');',
    'expect(brandAssets).toContain(\'path: "/brand/irha-apparels-official-master.png"\');',
)
replace(
    'src/test/faviconBranding.test.ts',
    'const BRAND_VERSION = "ia-brand-visual-e001-20260801";',
    f'const BRAND_VERSION = "{VERSION}";',
)
replace(
    'src/test/faviconBranding.test.ts',
    'expect(brandAssets).toContain(\'const OFFICIAL_OWNER_CREST = "/icon-512x512.png"\');',
    f'expect(brandAssets).toContain(\'const OFFICIAL_RUNTIME_CREST = "{RUNTIME}"\');',
)
replace(
    'src/test/faviconBranding.test.ts',
    'expect(brandAssets).not.toContain(\'OFFICIAL_OWNER_CREST = "/irha-brand-mark.svg"\');',
    'expect(brandAssets).toContain(\'path: "/brand/irha-apparels-official-master.png"\');',
)
replace(
    'src/test/faviconBranding.test.ts',
    'Official Irha Apparels Manufacturing Specialists crest supplied by the owner',
    'Official Irha Apparels Manufacturing Specialists crest derived from the exact owner-uploaded master.',
    1,
)
replace(
    'src/test/faviconBranding.test.ts',
    'expect(liveVerification).toContain("Official Irha Apparels Manufacturing Specialists crest supplied by the owner");',
    f'''expect(liveVerification).toContain("{MASTER_SHA}");
    expect(liveVerification).toContain("/brand/irha-apparels-official-master.png");
    expect(liveVerification).toContain("data:image/png;base64,");''',
)

live_path = ROOT / '.github/workflows/verify-official-brand-live.yml'
live = live_path.read_text()
source_marker = '          origin="https://irhaapparels.com"'
if source_marker not in live:
    raise SystemExit('Brand live source-origin marker missing')
live = live.replace(source_marker, '          origin="https://irha-apparels.pages.dev"', 1)
start_marker = '      - name: Verify official logo and favicon on production\n'
end_marker = '      - name: Verify canonical buyer routes on production\n'
start = live.index(start_marker)
end = live.index(end_marker, start)
old_block = live[start:end]
run_marker = '        run: |\n'
header_end = old_block.index(run_marker) + len(run_marker)
header = old_block[:header_end]
script = f'''          set -euo pipefail
          expected_master="{MASTER_SHA}"
          pages_origin="https://irha-apparels.pages.dev"
          apex_origin="https://irhaapparels.com"

          cloudflare_challenge() {{
            headers="$1"
            body="$2"
            if grep -Fqi 'cf-mitigated: challenge' "$headers" 2>/dev/null; then return 0; fi
            if grep -Fqi 'server: cloudflare' "$headers" 2>/dev/null && grep -Fqi 'Just a moment...' "$body" 2>/dev/null; then return 0; fi
            return 1
          }}

          png_dimensions() {{
            python3 -c 'import struct,sys; d=open(sys.argv[1],"rb").read(24); assert d[:8] == bytes.fromhex("89504e470d0a1a0a"); assert struct.unpack(">II", d[16:24]) == (int(sys.argv[2]), int(sys.argv[3]))' "$1" "$2" "$3"
          }}

          verify_origin() {{
            origin="$1"
            label="$2"
            allow_challenge="$3"
            ready=false

            for attempt in $(seq 1 18); do
              cache_bust="${{SOURCE_SHA::12}}-$label-$attempt-$RANDOM"
              prefix="/tmp/brand-$label"
              master_status="$(curl -sS --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -D "$prefix-master.headers" -o "$prefix-master.png" -w '%{{http_code}}' "$origin/brand/irha-apparels-official-master.png?brand_check=$cache_bust" || true)"
              if [ "$master_status" = "403" ] && cloudflare_challenge "$prefix-master.headers" "$prefix-master.png"; then
                if [ "$allow_challenge" = "true" ]; then
                  echo "::warning::GitHub-hosted $label brand observer received a verified Cloudflare challenge; independent public verification remains required."
                  echo "${{label}}_challenged=true" >> "$GITHUB_OUTPUT"
                  return 0
                fi
              fi

              runtime_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -o "$prefix-runtime.png" -w '%{{http_code}}' "$origin/brand/irha-apparels-official-runtime-512.png?brand_check=$cache_bust" || true)"
              favicon_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -o "$prefix-favicon.svg" -w '%{{http_code}}' "$origin/favicon.svg?brand_check=$cache_bust" || true)"
              legacy_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -D "$prefix-favicon-ico.headers" -o "$prefix-favicon.ico" -w '%{{http_code}}' "$origin/favicon.ico?brand_check=$cache_bust" || true)"
              icon192_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -o "$prefix-icon192.png" -w '%{{http_code}}' "$origin/icon-192x192.png?brand_check=$cache_bust" || true)"
              icon512_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -o "$prefix-icon512.png" -w '%{{http_code}}' "$origin/icon-512x512.png?brand_check=$cache_bust" || true)"
              apple_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -o "$prefix-apple.png" -w '%{{http_code}}' "$origin/apple-touch-icon.png?brand_check=$cache_bust" || true)"
              manifest_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -o "$prefix-manifest.json" -w '%{{http_code}}' "$origin/manifest.webmanifest?brand_check=$cache_bust" || true)"
              provenance_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -o "$prefix-provenance.json" -w '%{{http_code}}' "$origin/brand/brand-master.json?brand_check=$cache_bust" || true)"
              home_status="$(curl -sSL --connect-timeout 10 --max-time 40 -H 'Cache-Control: no-cache' -o "$prefix-home.html" -w '%{{http_code}}' "$origin/?brand_check=$cache_bust" || true)"
              master_hash="$(sha256sum "$prefix-master.png" 2>/dev/null | awk '{{print $1}}' || true)"
              favicon_source="$(awk 'BEGIN{{IGNORECASE=1}} /^x-irha-favicon-source:/ {{sub(/^[^:]+:[[:space:]]*/, ""); sub(/\\r$/, ""); print}}' "$prefix-favicon-ico.headers" | tail -n 1)"

              echo "Brand proof $label attempt $attempt/18: master=$master_status/$master_hash runtime=$runtime_status favicon=$favicon_status legacy=$legacy_status 192=$icon192_status 512=$icon512_status apple=$apple_status manifest=$manifest_status provenance=$provenance_status home=$home_status"

              if [ "$master_status" = "200" ] && [ "$master_hash" = "$expected_master" ] \\
                && [ "$runtime_status" = "200" ] && [ "$favicon_status" = "200" ] && [ "$legacy_status" = "200" ] \\
                && [ "$icon192_status" = "200" ] && [ "$icon512_status" = "200" ] && [ "$apple_status" = "200" ] \\
                && [ "$manifest_status" = "200" ] && [ "$provenance_status" = "200" ] && [ "$home_status" = "200" ] \\
                && png_dimensions "$prefix-master.png" 1024 1024 \\
                && png_dimensions "$prefix-runtime.png" 512 512 \\
                && png_dimensions "$prefix-icon192.png" 192 192 \\
                && png_dimensions "$prefix-icon512.png" 512 512 \\
                && png_dimensions "$prefix-apple.png" 180 180 \\
                && grep -Fq "data-master-sha256=\"$expected_master\"" "$prefix-favicon.svg" \\
                && grep -Fq 'data:image/png;base64,' "$prefix-favicon.svg" \\
                && grep -Fq "$expected_master" "$prefix-favicon.ico" \\
                && jq -e --arg sha "$expected_master" '.master.sha256 == $sha and .master.width == 1024 and .master.height == 1024 and .generation.crop == false and .generation.stretch == false' "$prefix-provenance.json" >/dev/null \\
                && jq -e '.icons | any(.src | startswith("/icon-192x192.png")) and any(.src | startswith("/icon-512x512.png"))' "$prefix-manifest.json" >/dev/null \\
                && grep -Fq '/brand/irha-apparels-official-runtime-512.png' "$prefix-home.html"; then
                if [ "$label" = "apex" ]; then
                  test -z "$favicon_source" || test "$favicon_source" = "official-owner-crest"
                fi
                ready=true
                echo "Exact owner-uploaded master and all normal brand derivatives verified at $label."
                break
              fi
              sleep 10
            done

            test "$ready" = "true" || {{
              echo "::error title=Official Irha brand not verified::$label did not serve the exact owner-uploaded master and required derivatives."
              return 1
            }}
          }}

          verify_origin "$pages_origin" pages false
          verify_origin "$apex_origin" apex true
'''
live = live[:start] + header + script + '\n' + live[end:]
live_path.write_text(live)

contract = f'''import {{ createHash }} from "node:crypto";
import {{ readFileSync }} from "node:fs";
import {{ resolve }} from "node:path";
import sharp from "sharp";
import {{ describe, expect, it }} from "vitest";

const ROOT = process.cwd();
const MASTER_PATH = "public/brand/irha-apparels-official-master.png";
const MASTER_PUBLIC_PATH = "/brand/irha-apparels-official-master.png";
const RUNTIME_PATH = "/brand/irha-apparels-official-runtime-512.png";
const MASTER_SHA256 = "{MASTER_SHA}";
const BRAND_VERSION = "{VERSION}";

const readText = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const readBytes = (path: string) => readFileSync(resolve(ROOT, path));
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

async function decoded(path: string, width: number, height: number) {{
  const image = sharp(readBytes(path), {{ failOn: "error" }});
  const metadata = await image.metadata();
  expect(metadata).toMatchObject({{ format: "png", width, height }});
  return image.raw().toBuffer();
}}

describe("IA-BRAND-MASTER-E001 official brand master contract", () => {{
  it("locks the exact owner-uploaded master by immutable identity", async () => {{
    const bytes = readBytes(MASTER_PATH);
    expect(hash(bytes)).toBe(MASTER_SHA256);
    expect(bytes.byteLength).toBe(1023183);
    const metadata = await sharp(bytes, {{ failOn: "error" }}).metadata();
    expect(metadata).toMatchObject({{ format: "png", width: 1024, height: 1024 }});
    await sharp(bytes, {{ failOn: "error" }}).raw().toBuffer();
  }});

  it("records one explicit provenance chain from locked master to every technical derivative", () => {{
    const provenance = JSON.parse(readText("public/brand/brand-master.json"));
    expect(provenance).toMatchObject({{
      schemaVersion: 1,
      executionId: "IA-BRAND-MASTER-E001",
      source: "owner-uploaded file in execution chat",
      master: {{
        path: MASTER_PATH,
        publicPath: MASTER_PUBLIC_PATH,
        sha256: MASTER_SHA256,
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        sizeBytes: 1023183,
      }},
      generation: {{
        implementation: "scripts/generate-official-brand-assets.mjs",
        library: "sharp",
        fit: "contain",
        kernel: "lanczos3",
        crop: false,
        stretch: false,
      }},
      brandAssetVersion: BRAND_VERSION,
    }});
    expect(provenance.derivatives.map((item: {{ publicPath: string }}) => item.publicPath)).toEqual(expect.arrayContaining([
      RUNTIME_PATH, "/favicon-16x16.png", "/favicon-32x32.png", "/favicon-48x48.png",
      "/apple-touch-icon.png", "/icon-192x192.png", "/icon-512x512.png",
    ]));
  }});

  it("proves committed raster derivatives are no-crop resizes of the locked master", async () => {{
    const master = readBytes(MASTER_PATH);
    for (const [path, size] of [
      ["public/brand/irha-apparels-official-runtime-512.png", 512],
      ["public/favicon-16x16.png", 16],
      ["public/favicon-32x32.png", 32],
      ["public/favicon-48x48.png", 48],
      ["public/apple-touch-icon.png", 180],
      ["public/icon-192x192.png", 192],
      ["public/icon-512x512.png", 512],
    ] as const) {{
      const actual = await decoded(path, size, size);
      const expected = await sharp(master, {{ failOn: "error" }})
        .resize(size, size, {{ fit: "contain", position: "centre", withoutEnlargement: true, kernel: sharp.kernel.lanczos3 }})
        .raw()
        .toBuffer();
      expect(Buffer.compare(actual, expected), path).toBe(0);
    }}
  }});

  it("keeps runtime, structured identity, fallback and static shell on the official master lineage", () => {{
    const brandAssets = readText("src/lib/brandAssets.ts");
    const navbar = readText("src/components/layout/Navbar.tsx");
    const footer = readText("src/components/layout/Footer.tsx");
    const imageLoading = readText("src/lib/imageLoading.ts");
    const publicIdentity = readText("src/lib/publicIdentity.mjs");
    const siteSettings = readText("src/lib/siteSettings.ts");
    const sanitizer = readText("scripts/sanitize-unsupported-trust-copy.mjs");

    expect(brandAssets).toContain(`BRAND_ASSET_VERSION = "${BRAND_VERSION}"`);
    expect(brandAssets).toContain(`path: "${MASTER_PUBLIC_PATH}"`);
    expect(brandAssets).toContain(`sha256: "${MASTER_SHA256}"`);
    expect(brandAssets).toContain(`const OFFICIAL_RUNTIME_CREST = "${RUNTIME_PATH}"`);
    expect(brandAssets).not.toContain('const OFFICIAL_OWNER_CREST = "/icon-512x512.png"');
    expect(navbar).toContain("BRAND_ASSETS.headerLogo");
    expect(footer).toContain("BRAND_ASSETS.footerLogo");
    expect(imageLoading).toContain("BRAND_ASSETS.controlledFallback");
    expect(publicIdentity).toContain(`logoUrl: "https://irhaapparels.com${RUNTIME_PATH}"`);
    expect(siteSettings).toContain(`logoUrl: "${RUNTIME_PATH}"`);
    expect(sanitizer).toContain(`src=\\"${RUNTIME_PATH}\\"`);
  }});

  it("locks favicon and PWA metadata to the same official provenance", async () => {{
    const favicon = readText("public/favicon.svg");
    const manifest = JSON.parse(readText("public/manifest.webmanifest"));
    expect(favicon).toContain(`data-master-sha256="${MASTER_SHA256}"`);
    expect(favicon).toContain("data:image/png;base64,");
    const prefix = 'href="data:image/png;base64,';
    const start = favicon.indexOf(prefix) + prefix.length;
    const end = favicon.indexOf('"', start);
    expect(start).toBeGreaterThan(prefix.length - 1);
    expect(end).toBeGreaterThan(start);
    expect(Buffer.compare(Buffer.from(favicon.slice(start, end).replace(/\\s+/g, ""), "base64"), readBytes("public/icon-192x192.png"))).toBe(0);
    await decoded("public/icon-192x192.png", 192, 192);
    await decoded("public/icon-512x512.png", 512, 512);
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({{ src: "/favicon.svg", sizes: "any" }}),
      expect.objectContaining({{ src: "/icon-192x192.png", sizes: "192x192" }}),
      expect.objectContaining({{ src: "/icon-512x512.png", sizes: "512x512" }}),
    ]));
  }});

  it("keeps the permanent generator itself hash-locked to this owner master", () => {{
    const generator = readText("scripts/generate-official-brand-assets.mjs");
    const liveVerification = readText(".github/workflows/verify-official-brand-live.yml");
    expect(generator).toContain(`path: "${MASTER_PATH}"`);
    expect(generator).toContain(`sha256: "${MASTER_SHA256}"`);
    expect(generator).toContain('fit: "contain"');
    expect(generator).toContain("sharp.kernel.lanczos3");
    expect(generator).toContain("crop: false");
    expect(generator).toContain("stretch: false");
    expect(liveVerification).toContain(MASTER_SHA256);
    expect(liveVerification).toContain(MASTER_PUBLIC_PATH);
    expect(liveVerification).toContain(RUNTIME_PATH);
  }});
}});
'''
(ROOT / 'src/test/brandMasterContract.test.ts').write_text(contract)

(ROOT / 'public/irha-logo-official-source-note.txt').write_text(
    f'Official Irha Apparels master logo locked by IA-BRAND-MASTER-E001 on 2026-08-02. '
    f'Authoritative repository source: public/brand/irha-apparels-official-master.png; SHA-256 {MASTER_SHA}; '
    'PNG 1024x1024, 1,023,183 bytes. Runtime, favicon, Apple and PWA assets are technical derivatives of that exact owner upload.\n'
)

(ROOT / 'docs/branding/IRHA_EXACT_LOGO_UPDATE_NOTE.md').write_text(f'''# Irha Apparels official brand master

Current authority: **IA-BRAND-MASTER-E001 / IRHA-OFFICIAL-BRAND-MASTER-01**.

The exact owner-uploaded circular navy-and-gold crest supplied on 2026-08-02 is the current and permanent source of truth. It contains “IRHA APPARELS” and “MANUFACTURING SPECIALISTS” around the detailed central shield.

- Master path: `public/brand/irha-apparels-official-master.png`
- SHA-256: `{MASTER_SHA}`
- MIME: `image/png`
- Dimensions: `1024 × 1024`
- File size: `1,023,183 bytes`

The master is preserved byte-for-byte. Runtime, favicon, Apple-touch and PWA files are generated technical derivatives using the permanent generator at `scripts/generate-official-brand-assets.mjs`. The previous square/historical icon classification from PR #825 is retained only as history and is not authoritative.
''')

for path in ['docs/IA_CONTENT_E001_BRAND_ASSET_PROVENANCE.md', 'docs/IA_BRAND_VISUAL_E001_EVIDENCE.md']:
    p = ROOT / path
    text = p.read_text()
    notice = f'> **Superseded brand authority:** IA-BRAND-MASTER-E001 (2026-08-02) now locks `public/brand/irha-apparels-official-master.png` at SHA-256 `{MASTER_SHA}` as the official owner master. Historical logo classifications below are audit history only.\n\n'
    if not text.startswith('> **Superseded brand authority:**'):
        p.write_text(notice + text)

(ROOT / 'docs/IA_BRAND_MASTER_E001_EVIDENCE.md').write_text(f'''# IA-BRAND-MASTER-E001 — Brand master evidence

Goal lock: `IRHA-OFFICIAL-BRAND-MASTER-01`

## Authoritative owner upload

- Repository master: `public/brand/irha-apparels-official-master.png`
- SHA-256: `{MASTER_SHA}`
- MIME: `image/png`
- Dimensions: `1024 × 1024`
- File size: `1,023,183 bytes`
- Artwork: circular navy-and-gold `IRHA APPARELS / MANUFACTURING SPECIALISTS` crest with detailed central shield

The repository master is the exact execution-chat owner upload. It is not redrawn, regenerated, approximated or AI-replaced.

## Root cause

PR #825 treated the then-existing square/historical icon lineage as the owner crest. `src/lib/brandAssets.ts` subsequently routed header, footer and controlled fallback through `/icon-512x512.png`. The tests proved internal derivative consistency but did not lock the actual owner master identity.

## Corrected contract

- `src/lib/brandAssets.ts` exposes the immutable master identity and routes normal branding through `{RUNTIME}`.
- `scripts/generate-official-brand-assets.mjs` generates no-crop, no-stretch technical derivatives from the exact master.
- `public/brand/brand-master.json` records derivative provenance and hashes.
- `src/test/brandMasterContract.test.ts` locks exact master SHA, decode/dimensions, derivative pixel lineage, Navbar, Footer, fallback, favicon/PWA metadata and live verification.
- A cache-version rotation to `{VERSION}` prevents normal runtime branding from continuing to request the previous artwork under the old brand cache key.

## Scope safety

No product media P001–P254, Supabase database, Supabase Storage, taxonomy, category structure, SEO copy, localization, pricing/MOQ claim, homepage layout or Cloudflare security setting is part of this correction.
''')

print('IA-BRAND-MASTER-E001 source corrections prepared')
