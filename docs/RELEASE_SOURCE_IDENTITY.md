# Exact Release Source Identity

Every production build exposes an exact Git source identity when the host provides one, a diagnostic full-output fingerprint, and a host-stable immutable-runtime fingerprint.

## Built contract

`dist/build.json` preserves the existing release metadata and adds:

- `source_commit`: exact 40-character Git SHA, or `unverified` when no trustworthy identity exists;
- `source_commit_short`: first 12 characters of the exact SHA;
- `built_at`: ISO build timestamp;
- `source_identity_state`: `verified` or `unverified`;
- `build_fingerprint`: SHA-256 of the complete deployable output after volatile identity metadata normalization;
- `build_fingerprint_algorithm`: `sha256`;
- `runtime_fingerprint`: host-stable SHA-256 of immutable runtime code, styles, media, fonts and downloadable assets;
- `runtime_fingerprint_algorithm`: `sha256`;
- `runtime_fingerprint_scope`: `immutable-runtime-assets`.

Every built HTML shell exposes the same values through:

- `x-irha-source-commit`;
- `x-irha-source-identity-state`;
- `x-irha-build-fingerprint`;
- `x-irha-build-fingerprint-algorithm`;
- `x-irha-runtime-fingerprint`;
- `x-irha-runtime-fingerprint-algorithm`;
- `x-irha-runtime-fingerprint-scope`.

## Commit resolution order

The build uses the first valid SHA from `GITHUB_SHA`, `CF_PAGES_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA`, `LOVABLE_GIT_COMMIT_SHA`, or `SOURCE_COMMIT_SHA`, then falls back to the checked-out Git `HEAD`. It never invents a commit identity.

## Two fingerprint scopes

The full `build_fingerprint` includes document shells and crawler output. It is diagnostic and deliberately changes when host-generated HTML, robots, sitemap or other text shells differ.

The `runtime_fingerprint` includes immutable runtime payloads: files under `assets/`, `media/` and `catalogs/`, plus immutable code, style, image, font, media, PDF and archive file types elsewhere. It excludes HTML, robots, sitemap, release observation manifests and other host-generated text shells. This prevents Cloudflare-managed robots or Lovable-generated shell differences from being mistaken for application-code drift.

## Cross-host parity rule

A custom-domain build with an `unverified` Git identity may be classified as runtime-source parity only when all of the following are true:

1. its `runtime_fingerprint` exactly matches an exact-SHA, Quality-Gate-approved build;
2. release name, repository, owner Supabase identity and canonical origin match;
3. live HTTP health and redirect behavior pass;
4. host-shell differences are reported separately and are not hidden by the runtime match.

A missing or mismatched runtime fingerprint remains unverified and blocks parity claims. A matching runtime fingerprint does not excuse a broken canonical, robots, sitemap or other live shell contract.

## Release gate

GitHub Actions requires the generated manifest and every built HTML shell to equal the workflow's exact `GITHUB_SHA`, report `verified`, expose valid full and runtime fingerprints, and reproduce both fingerprints from the final build output. Any mismatch blocks release approval.

Cloudflare Pages re-runs the deterministic checks and publishes every accepted `main` update to the guarded `pages.dev` release mirror. DNS/custom domains remain unchanged by that workflow.

Production publish remains separate from build verification. Publish is allowed only after exact latest-main Quality Gate success, exact Lovable sync, and proof that production is behind the approved release.
