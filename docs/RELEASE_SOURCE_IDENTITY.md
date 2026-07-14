# Exact Release Source Identity

Every production build exposes an exact Git source identity when the host provides one, a diagnostic full-output fingerprint, a broad runtime payload fingerprint, and a host-stable compiled application fingerprint.

## Built contract

`dist/build.json` preserves the existing release metadata and adds:

- `source_commit`: exact 40-character Git SHA, or `unverified` when no trustworthy identity exists;
- `source_commit_short`: first 12 characters of the exact SHA;
- `built_at`: ISO build timestamp;
- `source_identity_state`: `verified` or `unverified`;
- `build_fingerprint`: SHA-256 of the complete deployable output after volatile identity metadata normalization;
- `build_fingerprint_algorithm`: `sha256`;
- `runtime_fingerprint`: SHA-256 of broad immutable runtime and media payloads;
- `runtime_fingerprint_algorithm`: `sha256`;
- `runtime_fingerprint_scope`: `immutable-runtime-assets`;
- `application_fingerprint`: host-stable SHA-256 of compiled JavaScript, CSS and WebAssembly under `assets/`;
- `application_fingerprint_algorithm`: `sha256`;
- `application_fingerprint_scope`: `compiled-assets-js-css-wasm`.

Built HTML shells expose the source, full-output and broad-runtime values. The compiled application fingerprint is exposed through `build.json`, which is the canonical machine-readable release identity endpoint.

## Commit resolution order

The build uses the first valid SHA from `GITHUB_SHA`, `CF_PAGES_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA`, `LOVABLE_GIT_COMMIT_SHA`, or `SOURCE_COMMIT_SHA`, then falls back to the checked-out Git `HEAD`. It never invents a commit identity.

## Three fingerprint scopes

The full `build_fingerprint` includes document shells and crawler output. It is diagnostic and deliberately changes when host-generated HTML, robots, sitemap or other text shells differ.

The broad `runtime_fingerprint` includes compiled assets, public media, catalogues and other immutable payloads. It deliberately changes when Lovable or another host transforms, omits or regenerates media. That mismatch remains visible as a media/runtime payload difference.

The `application_fingerprint` includes only compiled JavaScript, CSS and WebAssembly under `assets/`. Vite content hashes and entry references make this fingerprint sensitive to application code, lazy chunks, styles and compiled module changes while excluding host-generated shells and media optimization. It is the cross-host application-code parity signal.

## Cross-host parity rule

A custom-domain build with an `unverified` Git identity may be classified as application-source parity only when all of the following are true:

1. its `application_fingerprint` exactly matches an exact-SHA, Quality-Gate-approved build;
2. release name, repository, owner Supabase identity and canonical origin match;
3. live HTTP health and redirect behavior pass;
4. full-output and broad-runtime differences are reported separately and are not hidden by the application match.

A missing or mismatched application fingerprint remains unverified and blocks application parity claims. A matching application fingerprint does not excuse broken canonical, robots, sitemap, media delivery or other live-shell contracts.

## Release gate

GitHub Actions requires the generated manifest to equal the workflow's exact `GITHUB_SHA`, report `verified`, expose valid full, runtime and application fingerprints, and reproduce all three from the final build output. Built HTML source/full/runtime metadata must also pass. Any mismatch blocks release approval.

Cloudflare Pages re-runs the deterministic checks and publishes every accepted `main` update to the guarded `pages.dev` release mirror. DNS/custom domains remain unchanged by that workflow.

Production publish remains separate from build verification. Publish is allowed only after exact latest-main Quality Gate success, exact Lovable sync, and proof that production is behind the approved release.
