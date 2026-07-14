# Exact Release Source Identity

Every production build must expose the exact Git commit used to create it.

## Built contract

`dist/build.json` preserves the existing release metadata and adds:

- `source_commit`: exact 40-character Git SHA, or `unverified` when no trustworthy identity exists;
- `source_commit_short`: first 12 characters of the exact SHA;
- `built_at`: ISO build timestamp;
- `source_identity_state`: `verified` or `unverified`.

Every built HTML shell also exposes the same identity through:

- `x-irha-source-commit`;
- `x-irha-source-identity-state`.

## Resolution order

The build uses the first valid SHA from `GITHUB_SHA`, `CF_PAGES_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA`, `LOVABLE_GIT_COMMIT_SHA`, or `SOURCE_COMMIT_SHA`, then falls back to the checked-out Git `HEAD`. It never invents a commit identity.

## Release gate

GitHub Actions requires the generated manifest and every built HTML shell to equal the workflow's exact `GITHUB_SHA` and report `verified`. A mismatch or an unverified identity blocks release approval.

Production publish remains separate from build verification. Publish is allowed only after exact latest-main Quality Gate success, exact Lovable sync, and proof that production is behind the approved commit.
