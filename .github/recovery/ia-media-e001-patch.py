from pathlib import Path
import re

CLEAN_BRANCH = "codex/ia-media-e001-clean-recovery"

remediation = Path(".github/workflows/ia-media-e001-remediation.yml")
text = remediation.read_text()
text, count = re.subn(
    r"on:\n  push:\n.*?  workflow_dispatch:\n",
    "on:\n  workflow_dispatch:\n",
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("could not remove automatic staging trigger")
replacements = {
    "run-name: IA-MEDIA-E001 ${{ github.event_name == 'workflow_dispatch' && inputs.mode || 'stage' }} · ${{ github.sha }}":
        "run-name: IA-MEDIA-E001 ${{ inputs.mode }} · ${{ github.sha }}",
    "group: ${{ (github.event_name != 'workflow_dispatch' || inputs.mode == 'stage' || inputs.mode == 'apply') && 'irha-production-mutation' || format('ia-media-e001-{0}-{1}', inputs.mode, github.ref) }}":
        "group: ${{ (inputs.mode == 'stage' || inputs.mode == 'apply') && 'irha-production-mutation' || format('ia-media-e001-{0}-{1}', inputs.mode, github.ref) }}",
    "IA_MEDIA_EFFECTIVE_MODE: ${{ github.event_name == 'workflow_dispatch' && inputs.mode || 'stage' }}":
        "IA_MEDIA_EFFECTIVE_MODE: ${{ inputs.mode }}",
    "IA_MEDIA_EFFECTIVE_CONFIRM: ${{ github.event_name == 'workflow_dispatch' && inputs.confirm || 'NO' }}":
        "IA_MEDIA_EFFECTIVE_CONFIRM: ${{ inputs.confirm }}",
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f"remediation replacement anchor missing: {old}")
    text = text.replace(old, new, 1)
remediation.write_text(text)

visual = Path(".github/workflows/ia-media-e001-visual-acceptance.yml")
text = visual.read_text()
old_branch = "codex/official-logo-p001-p007-media-recovery"
if old_branch not in text:
    raise SystemExit("visual workflow source branch guard missing")
visual.write_text(text.replace(old_branch, CLEAN_BRANCH))

footer = Path("src/components/layout/Footer.tsx")
text = footer.read_text()
import_anchor = 'import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";\n'
if import_anchor not in text:
    raise SystemExit("footer import anchor missing")
text = text.replace(
    import_anchor,
    import_anchor + 'import { BRAND_ASSETS } from "@/lib/brandAssets";\n',
    1,
)
old_block = '''          <Link to={getLocaleGateway(locale)} className="inline-flex items-center gap-3" aria-label={`${PUBLIC_IDENTITY.name} ${copy.tagline}`}>
            <img src="/irha-brand-mark.svg" alt="Official Irha Apparels Manufacturing Specialists crest" className="h-20 w-20 shrink-0 object-contain object-left" />
            <span className="leading-none"><span className="block font-display text-2xl font-semibold text-foreground">{PUBLIC_IDENTITY.name}</span><span className="mt-1.5 block text-[8px] font-bold uppercase tracking-[0.22em] text-primary">{copy.tagline}</span></span>
          </Link>'''
new_block = '''          <Link to={getLocaleGateway(locale)} className="inline-flex items-center" aria-label={`${PUBLIC_IDENTITY.name} ${copy.tagline}`}>
            <img
              src={BRAND_ASSETS.footerLogo}
              alt="Official Irha Apparels Manufacturing Specialists logo"
              width="760"
              height="160"
              className="h-auto w-[13.5rem] shrink-0 object-contain object-left"
              loading="eager"
              decoding="async"
            />
            <span className="sr-only">{PUBLIC_IDENTITY.name} — {copy.tagline}</span>
          </Link>'''
if old_block not in text:
    raise SystemExit("footer logo block missing")
footer.write_text(text.replace(old_block, new_block, 1))

verifier = Path("scripts/verify-built-image-seo.mjs")
text = verifier.read_text()
import_anchor = 'import { JSDOM } from "jsdom";\n'
if import_anchor not in text:
    raise SystemExit("image SEO import anchor missing")
text = text.replace(
    import_anchor,
    import_anchor + 'import { isDeterministicProductPrimaryPath } from "./lib/product-primary-image-path.mjs";\n',
    1,
)
old_block = '''    const referencePrefix = product.reference_code.toLowerCase();
    const pathname = new URL(primary).pathname;
    const directory = pathname.split("/").at(-2) || "";
    const filename = pathname.split("/").at(-1) || "";
    if (!pathname.includes("/catalog/products/")
      || !directory.startsWith(`${referencePrefix}-`)
      || !filename.startsWith(`${referencePrefix}-`)
      || !/-front\\.(?:avif|jpe?g|png|webp)$/i.test(filename)) {
      throw new Error(`${product.reference_code} primary image path is not deterministic: ${primary}`);
    }'''
new_block = '''    const pathname = new URL(primary).pathname;
    if (!isDeterministicProductPrimaryPath(product.reference_code, pathname)) {
      throw new Error(`${product.reference_code} primary image path is not deterministic: ${primary}`);
    }'''
if old_block not in text:
    raise SystemExit("image SEO deterministic-path block missing")
verifier.write_text(text.replace(old_block, new_block, 1))

favicon_test = Path("src/test/faviconBranding.test.ts")
text = favicon_test.read_text()
old_line = r'''    expect(workerPatch).toContain('X-Irha-Favicon-Source\", \"official-owner-crest');'''
new_line = '''    expect(workerPatch).toContain('X-Irha-Favicon-Source", "official-owner-crest');'''
if old_line not in text:
    raise SystemExit("favicon lint-fix anchor missing")
favicon_test.write_text(text.replace(old_line, new_line, 1))
