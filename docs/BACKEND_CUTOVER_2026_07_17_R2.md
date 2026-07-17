# PR #1 (R2) — Owner Supabase Cutover Runbook

Supersedes the earlier assumption that a one-click "Swap Project" exists in the
Lovable Cloud UI. It does not. Mobile Cloud → Overview offers no disconnect for
`mlefxgyaqoisvdmoiapq` and no direct authorize for `pvzjiozismyxqrzmtfbi`.

This runbook is designed for zero data loss and a fully reversible cutover.

## 0. Ground truth (audited 2026-07-17)

| Surface | Project ref | State |
|---|---|---|
| Production runtime (browser bundle) | `pvzjiozismyxqrzmtfbi` | Already live — client hardcodes owner via `src/integrations/supabase/ownerRuntime.ts`. |
| `supabase/config.toml` | `pvzjiozismyxqrzmtfbi` | Correct. |
| GitHub CI/CD (8 workflows) | `pvzjiozismyxqrzmtfbi` | Correct. Build guards reject archive ref in `dist/`. |
| Cloudflare Pages build.json contract | `pvzjiozismyxqrzmtfbi` | Enforced by `cloudflare-pages-production.yml`. |
| `.env` (`VITE_SUPABASE_*`) | `mlefxgyaqoisvdmoiapq` | Unused by runtime, still consumed by local type-gen and Lovable tools. |
| Lovable Cloud tooling channel (migrations / secrets / storage / psql from chat) | `mlefxgyaqoisvdmoiapq` | Cannot be swapped from the UI. |

Production traffic is not on the archive. Only the Lovable Cloud *authoring
tooling* is.

## 1. Non-negotiable rules

- No changes to production `.env` on Cloudflare Pages until step 6.
- No `DROP`, no bucket deletion, no traffic switch until step 6.
- Every migration lands via `supabase-owner-release.yml` (guarded by manual
  `APPLY_SUPABASE_RELEASE` input) or the standard `supabase-database-auto.yml`.
- Cloud disconnect is destructive to `mlefxgyaqoisvdmoiapq` and is only done
  after owner parity is confirmed and a 14-day archive export is in cold
  storage.

## 2. Owner-side verification (owner runs, ~10 min)

On a workstation with `supabase` CLI logged into `pvzjiozismyxqrzmtfbi`:

```
supabase link --project-ref pvzjiozismyxqrzmtfbi
supabase migration list                         # expect the 168 files in main
supabase db remote commit --dry-run             # expect: no drift
supabase functions list --project-ref pvzjiozismyxqrzmtfbi   # expect 45 functions
```

Then in the owner SQL editor:

```sql
-- table + row parity report
SELECT relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- storage parity
SELECT id, public,
       (SELECT count(*) FROM storage.objects o WHERE o.bucket_id = b.id) AS n
FROM storage.buckets b
ORDER BY id;

-- auth parity
SELECT count(*) FROM auth.users;
SELECT provider, count(*) FROM auth.identities GROUP BY provider;

-- cron parity
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
```

Compare against archive counts recorded in section 3 of the audit above.
Any mismatch is triaged before step 3.

## 3. Data + storage sync (only if owner shows gaps)

If owner shows data or storage gaps versus archive, do NOT run a live
cross-project copy. The originally referenced helper
`scripts/mirror-archive-buckets.mjs` does NOT exist in the repository
(claim retracted 2026-07-17 during PR #2 pre-audit). A mirror path, if
needed, must be added as an explicit PR with owner review before use.

Interim procedure:

1. Use the on-archive `database_export_12_07_26` bucket (present on archive
   only) as a cold reference. Restore any missing rows into owner as a
   targeted, reviewed SQL migration through `supabase-owner-release.yml`.
2. For any object-storage gaps (`mockup-cache`, `social-uploads`, etc.),
   surface the diff as a manual checkpoint. No automated mirror script is
   shipped; do not synthesize one without an approved PR.

Skip this section entirely if owner counts already match or exceed archive.

### Deferred verification checkpoints (non-blocking, owner-side)

The following require credentialed access to `pvzjiozismyxqrzmtfbi` that is
not reachable from the Lovable Cloud tooling channel. Record results
manually; PR #2 proceeds without them:

- exact owner-side table count and per-table row counts
- exact owner-side storage bucket + object counts
- exact owner-side auth user count and enabled providers
- exact owner-side cron.job list and pg_trigger inventory
- exact owner-side RLS policy count and webhook registrations
- live confirmation that production inquiries and Admin dashboard
  read/write `pvzjiozismyxqrzmtfbi` (frontend code path is proven; a
  real submission + owner-side row read is the outstanding evidence)


## 4. Secrets parity (owner-side)

Owner Supabase must have these runtime secrets before functions run:

```
LOVABLE_API_KEY
META_ACCESS_TOKEN
META_PAGE_ID
IG_ACCOUNT_ID
LINKEDIN_API_KEY          # via connector
TIKTOK_API_KEY            # via connector
GOOGLE_SEARCH_CONSOLE_API_KEY  # via connector
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWKS`, `SUPABASE_DB_URL` are auto-managed
per project — do not copy from archive.

Verify: `supabase secrets list --project-ref pvzjiozismyxqrzmtfbi`.

## 5. Preview against owner (no traffic change)

1. Open the current PR preview URL. `build.json` will contain
   `"supabase_project_id": "pvzjiozismyxqrzmtfbi"` (already enforced by
   `cloudflare-pages-preview.yml`).
2. Sign in, submit a test inquiry, load a category, open Admin. Confirm every
   call hits `pvzjiozismyxqrzmtfbi.supabase.co` in DevTools Network.
3. Run `production-smoke.yml` against the preview URL manually with
   `IRHA_EXPECTED_SUPABASE_PROJECT_ID=pvzjiozismyxqrzmtfbi`.

## 6. Final cutover — owner approval only

Only after sections 2–5 all pass:

1. Owner triggers `supabase-owner-release.yml` with
   `APPLY_SUPABASE_RELEASE` to lock the current migration set as the release
   baseline on owner.
2. Merge PR #1 (this runbook + the `.env` retirement change below).
3. Owner rotates the Cloudflare Pages Production env vars so
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   `VITE_SUPABASE_PROJECT_ID` all point at `pvzjiozismyxqrzmtfbi`. (Runtime
   already ignores these, but this closes the last inconsistency and makes
   `types.ts` regeneration safe.)
4. Owner triggers `cloudflare-pages-production.yml`. Build guards reject the
   deploy if `mlefxgyaqoisvdmoiapq` appears anywhere in `dist/`.
5. Run `production-smoke.yml` against `https://irhaapparels.com`.

## 7. Retiring the Lovable Cloud tooling channel

Once step 6 is green and stable for 7 days:

1. Export archive one more time: Cloud → Advanced settings → Export data.
   Store the archive locally and in a private R2 bucket for 90 days.
2. In the Lovable UI (desktop, not mobile — mobile does not surface the
   control): Cloud → Advanced settings → **Disconnect Cloud**. This wipes
   `mlefxgyaqoisvdmoiapq` and disables the `supabase--*` chat tools. Runtime,
   CI, and production are unaffected because they never used the archive.
3. Regenerate `.env` locally against owner using
   `supabase gen types typescript --project-id pvzjiozismyxqrzmtfbi > src/integrations/supabase/types.ts`
   and commit the refreshed types on a follow-up PR.

If disconnecting Cloud is undesirable (for example, the workspace wants to keep
the chat migration tool available for a different future project), leave Cloud
connected. The archive is inert; runtime ignores it. This is a supported
end-state.

## 8. Rollback

Any step 1–5 failure: nothing to roll back — production still points at
`pvzjiozismyxqrzmtfbi` and no schema was moved.

Step 6 failure: revert the Cloudflare env-var change (values are stored in the
Pages project history) and redeploy. Runtime returns to hardcoded owner. If a
migration on owner is at fault, use
`supabase migration repair --status reverted <version> --project-ref pvzjiozismyxqrzmtfbi`
and roll the corresponding PR back on `main`.

Step 7 failure (Cloud disconnect regret): the archive cannot be reattached.
Restore from the export stored in step 7.1 into a new Lovable Cloud project if
scratch tooling is needed again. Production is unaffected.

## 9. Manual owner actions that remain (only these)

1. Run the owner-side verification queries in section 2.
2. If gaps exist, approve the targeted data/storage sync PR from section 3.
3. Confirm owner secrets in section 4 (usually already present).
4. Approve and trigger `supabase-owner-release.yml`
   (`APPLY_SUPABASE_RELEASE`).
5. Rotate Cloudflare Pages Production `VITE_SUPABASE_*` env vars to owner
   values.
6. Approve `cloudflare-pages-production.yml` and `production-smoke.yml`.
7. (Optional, after 7-day soak) desktop Lovable UI → Cloud → Advanced
   settings → Disconnect Cloud.

No mobile UI action is required. Nothing in this list changes production
traffic before step 5, and steps 1–4 are entirely reversible.
