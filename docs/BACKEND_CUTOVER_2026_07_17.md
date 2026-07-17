# PR #1 — Backend Identity Cutover Runbook (2026-07-17)

## Objective
Make owner Supabase project `pvzjiozismyxqrzmtfbi` the single source of truth for the Lovable connector, `.env`, edge functions, and storage. Archive project `mlefxgyaqoisvdmoiapq` becomes read-only rollback.

## Verified split-brain evidence (pre-cutover)
| Surface | Value | Correct? |
|---|---|---|
| `.env` `VITE_SUPABASE_PROJECT_ID` | `mlefxgyaqoisvdmoiapq` | ❌ archive |
| `.env` `VITE_SUPABASE_URL` | `https://mlefxgyaqoisvdmoiapq.supabase.co` | ❌ archive |
| Lovable chat/connector runtime | `mlefxgyaqoisvdmoiapq` | ❌ archive |
| `public/build.json` `supabase_project_id` | `pvzjiozismyxqrzmtfbi` | ✅ owner |
| Project knowledge / production runtime | `pvzjiozismyxqrzmtfbi` | ✅ owner |

Live counts observed on the currently-connected archive DB (for reference only):
products=64, categories=26, media_assets=0, inquiries=0, b2b_leads=0, blog_posts=0.

## Owner manual steps (required — cannot be automated)
1. Open **Backend** panel in Lovable.
2. **Disconnect** the current Lovable Cloud backend (`mlefxgyaqoisvdmoiapq`).
3. Choose **Connect Supabase** and authorize the owner project **`pvzjiozismyxqrzmtfbi`**.
4. Confirm the Backend panel shows `pvzjiozismyxqrzmtfbi` as active.
5. Reply in this chat: `cutover done`.

## Automated verification (runs after owner confirms)
- `scripts/verify-deployment-source.mjs` — asserts `.env` matches `pvzjiozismyxqrzmtfbi`.
- `supabase--project_info` — confirms connector ref.
- Snapshot counts on owner DB (products, categories, media_assets, inquiries, b2b_leads, storage buckets, migrations, functions) and record here as the post-cutover baseline.
- `supabase--linter` — capture pre-existing findings so later PRs don't inherit blame.
- `scripts/production-smoke-v2.mjs` on preview.

## Post-cutover baseline (to be filled in after step 5)
- Products: _tbd_
- Categories: _tbd_
- Media assets: _tbd_
- Inquiries: _tbd_
- B2B leads: _tbd_
- Storage buckets: _tbd_
- Migrations applied: _tbd_
- Edge Functions deployed: _tbd_
- Supabase linter findings (critical/high): _tbd_

## Rollback
If owner reports the site broken post-cutover:
1. Reconnect `mlefxgyaqoisvdmoiapq` in the Backend panel.
2. Restore `.env` from git history (last commit before this PR).
3. Redeploy previous Lovable version via Version History.
No data is destroyed by cutover — it is a pointer change only.

## Definition of Done for PR #1
- [ ] Owner confirms connector = `pvzjiozismyxqrzmtfbi`.
- [ ] `.env` regenerated on connect and matches owner project.
- [ ] Baseline counts recorded above.
- [ ] Supabase linter snapshot saved.
- [ ] `production-smoke-v2.mjs --preview` green.
- [ ] No frontend query regressions in preview (products list, category pages).
