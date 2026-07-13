# Final active public-schema RLS optimization — 2026-07-13

## Live migration

`20260713211051_optimize_remaining_public_rls_auth_initplan`

## Scope

Optimize the final active public-schema admin policies across legacy leads, listings, business modules, chat, catalogue audit, page views, public-submission audit and older social tables.

## Verification

- owner admin access remained available;
- 2,089 page-view records remained visible to the owner;
- non-admin authenticated access remained blocked;
- all active `public` schema direct per-row `auth.uid()` / `auth.role()` policy calls remaining: 0;
- no records were created, modified or deleted.

## Exclusions

Archived legacy schemas, migration backup schemas, unused-index removal and hosted Auth settings were not changed.
