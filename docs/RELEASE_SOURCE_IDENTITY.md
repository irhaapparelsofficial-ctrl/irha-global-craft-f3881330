# Exact Release Source Identity

Every production build exposes an exact Git source identity when the host provides one, plus a deterministic deployable-content fingerprint on every host.

## Built contract

`dist/build.json` preserves the existing release metadata and adds:

- `source_commit`: exact 40-character Git SHA, or `unverified` when no trustworthy identity exists;
- `source_commit_short`: first 12 characters of the exact SHA;
- `built_at`: ISO build timestamp;
- `source_identity_state`: `verified` or `unverified`;
- `build_fingerprint`: deterministic SHA-256 of the deployable output;
- `build_fingerprint_algorithm`: `sha256`.

Every built HTML shell exposes the same values through:

- `x-irha-source-commit`;
- `x-irha-source-identity-state`;
- `x-irha-build-fingerprint`;
- `x-irha-build-fingerprint-algorithm`.

## Commit resolution order

The build uses the first valid SHA from `GITHUB_SHA`, `CF_PAGES_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA`, `LOVABLE_GIT_COMMIT_SHA`, or `SOURCE_COMMIT_SHA`, then falls back to the checked-out Git `HEAD`. It never invents a commit identity.

## Deterministic parity

The fingerprint includes every deployable file path and byte except volatile release-observation files (`build.json` and `cloudflare-deployment.json`). Release identity/fingerprint meta tags are normalized out of HTML before hashing. Therefore GitHub, Cloudflare Pages and Lovable builds of the same deployable source produce the same fingerprint even when build timestamps or Git environment availability differ.

A custom-domain build with an `unverified` Git identity may be classified as deployable-source parity only when its fingerprint exactly matches an exact-SHA, Quality-Gate-approved build. A missing or mismatched fingerprint remains unverified and blocks parity claims.

## Release gate

GitHub Actions requires the generated manifest and every built HTML shell to equal the workflow's exact `GITHUB_SHA`, report `verified`, expose a valid fingerprint, and reproduce that fingerprint from the final build output. Any mismatch blocks release approval.

Cloudflare Pages re-runs the deterministic checks and publishes every accepted `main` update to the guarded `pages.dev` release mirror. DNS/custom domains remain unchanged by that workflow.

Production publish remains separate from build verification. Publish is allowed only after exact latest-main Quality Gate success, exact Lovable sync, and proof that production is behind the approved deployable source.
