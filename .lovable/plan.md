# Automation Tasks — Duplicate Detection Report (read-only)

Source: live owner Supabase (`pvzjiozismyxqrzmtfbi`), `public.automation_tasks`. No writes performed.

## Method

Three duplicate signals were compared:

1. **Exact idempotency-key collisions** — `GROUP BY idempotency_key HAVING count(*) > 1`.
2. **Semantic duplicates** — same `(module, action, title)` appearing in more than one active row (`status IN draft, ready_for_review, approved, blocked`).
3. **Overlapping scheduled windows** — for the same `(module, action)`, any two active rows whose `scheduled_for` timestamps fall within ±60 minutes.

Scope: 61 total tasks; 60 active. Terminal statuses (`executed`, `failed`, `cancelled`) excluded from duplicate-risk scoring.

## Result summary

| Signal | Count |
|---|---|
| Exact idempotency-key duplicates | **0** (unique constraint enforced) |
| Semantic `(module, action, title)` duplicate groups | **5** (21 rows) |
| Overlapping scheduled-window pairs (±60 min) | **0** (`scheduled_for` is NULL for all planning-cycle tasks) |

No true duplicate exists at the database-integrity level: every row has a distinct idempotency key and none share a scheduled window. The 21 semantically-similar rows are legitimate **daily-cycle repeats** of the same rotation slot across different `automation:<date>:…` cycles, held in `ready_for_review` because the owner has not yet actioned prior drafts. They are backlog, not duplicates.

## Semantic-repeat groups (21 rows across 5 groups)

| module | action | title | rows | first day | last day |
|---|---|---|---|---|---|
| listings | prepare_listing_updates | Prepare truthful B2B listing profiles and posts | 13 | 2026-07-12 | 2026-07-24 |
| creative | create_canva_reel | Create premium B2B Canva reel draft · Premium Leather | 2 | 2026-07-16 | 2026-07-21 |
| creative | create_canva_reel | Create premium B2B Canva reel draft · Streetwear & Activewear | 2 | 2026-07-18 | 2026-07-23 |
| leads | discover_and_verify | Discover verified B2B buyers · Germany · Bavarian & Trachten | 2 | 2026-07-12 | 2026-07-20 |
| seo | create_localized_drafts | Prepare useful localized SEO drafts · de-DE · Bavarian & Trachten | 2 | 2026-07-12 | 2026-07-20 |

All 21 rows carry distinct idempotency keys of the form `automation:<YYYY-MM-DD>:<module>[:<axis>]`. Two minor key-format variants exist for pre/post-refactor rows (e.g. `…:leads:germany:bavarian` vs `…:leads:Germany:Bavarian & Trachten`) but they still represent different daily cycles, not collisions.

## Interpretation

- Duplicate-guard integrity is intact: unique constraint + `ON CONFLICT DO NOTHING` in the planner prevent same-day re-inserts.
- Scheduled-window overlap check returns 0 because planning-cycle tasks are not time-gated; overlap can only occur once tasks acquire `scheduled_for`.
- The 13-row `listings` repeat is the largest cluster; it recurs daily by design and will keep growing one row per day until the owner reviews and closes them.

## Recommended non-destructive follow-up (owner decision only)

- Owner reviews and closes older `ready_for_review` cycles (2026-07-12 … 2026-07-20) so the daily planner's rotation coverage reads as fresh.
- If desired, add a scheduled auto-cancel for `ready_for_review` tasks older than N days; not implemented in this report.

_No code, database, settings, content, or external-system changes were performed. This is a read-only report._
