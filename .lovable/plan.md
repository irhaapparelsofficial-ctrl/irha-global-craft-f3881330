
# Daily Automation Inspection — Read-Only Report

Source: live owner Supabase (`pvzjiozismyxqrzmtfbi`), inspected at request time. No writes performed.

## 1. `public.automation_settings` (row id = `default`)

```json
{
  "enabled": true,
  "timezone": "Asia/Karachi",
  "daily_run_time": "08:30:00",
  "last_run_at": "2026-07-21T03:30:00.190812+00:00",
  "next_run_at": "2026-07-22T03:30:00+00:00",
  "modules": {
    "leads_enabled": true,
    "seo_enabled": true,
    "listings_enabled": true,
    "social_enabled": true,
    "canva_handoff_enabled": true
  },
  "auto_publish_flags": {
    "lead_auto_import": false,
    "seo_auto_publish": false,
    "social_auto_publish": false,
    "external_listing_publish": false
  },
  "rotations": {
    "lead_markets": ["Germany","Austria","Switzerland","United Kingdom","United States","Canada","Australia","United Arab Emirates"],
    "lead_product_focus": ["Bavarian & Trachten","Premium Leather","Sportswear","Streetwear & Activewear","Leisurewear & Nightwear"],
    "seo_locales": ["de-DE","de-AT","de-CH","fr-FR","es-ES","it-IT","nl-NL","ar-AE"],
    "social_platforms": ["instagram","facebook","linkedin","tiktok"]
  },
  "daily_limits": { "leads": 20, "seo_drafts": 2, "listings": 3, "social_drafts": 2 },
  "weekly_reel_target": 3
}
```

Notes:
- All 5 modules enabled; **all auto-publish flags OFF** (approval-gated, matches operating policy).
- Last run 2026-07-21 03:30 UTC (= 08:30 Asia/Karachi). Next run scheduled 2026-07-22 03:30 UTC.

## 2. Pending / due `automation_tasks`

All open tasks have `status = ready_for_review`, `external_action = false`, `scheduled_for = null` (planning-cycle tasks; no time gating), and `result IS NOT NULL` (drafts/evidence already attached). No tasks in `pending`, `scheduled`, `running`, `blocked`, or `failed`.

Latest cycle — day `2026-07-21` (market rotation: Austria / Premium Leather; locale de-AT; platform facebook):

| id | module | action | title | requires_approval | idempotency_key |
|---|---|---|---|---|---|
| f05ed081… | listings | prepare_listing_updates | Prepare truthful B2B listing profiles and posts | true | automation:2026-07-21:listings |
| 40eb945e… | seo | create_localized_drafts | de-AT · Premium Leather | false | automation:2026-07-21:seo:de-AT:Premium Leather |
| e89603e5… | leads | discover_and_verify | Austria · Premium Leather | false | automation:2026-07-21:leads:Austria:Premium Leather |
| 7c3e131a… | creative | create_canva_reel | Premium Leather (reel day) | false | automation:2026-07-21:creative:reel:Premium Leather |
| 5a22645a… | social | create_social_drafts | facebook · Premium Leather | false | automation:2026-07-21:social:facebook:Premium Leather |

Older `ready_for_review` backlog present for cycles 2026-07-20, 07-19, 07-18, 07-17, 07-16 (same 4–5 modules per day). Backlog is accumulating because owner has not yet actioned prior daily drafts.

## 3. Duplicate check

Query: `GROUP BY idempotency_key HAVING count(*) > 1` → **0 rows**. Each day/module/market/product/locale/platform combination has exactly one task. The `automation:<date>:<module>[:<axis>]` idempotency key is enforced (planner uses `ON CONFLICT DO NOTHING`), so re-running the planner for the same day cannot duplicate tasks.

No semantic duplicates observed either: rotation index cycles daily by `extract(doy)`, and each cycle's (market, product, locale, platform) tuple differs from the previous day's.

## 4. Latest `automation_runs`

Most recent run rows are all `status = completed`, `external_execution = false`, trigger `cron`, one per calendar day at 03:30 UTC. No `failed` or `running` runs.

## Summary

- Automation is armed, gated (no auto-publish, no external send).
- 2026-07-21 cycle executed cleanly; 5 draft tasks await owner review.
- Multi-day `ready_for_review` backlog (~5 cycles) — informational only; no duplication, no failures.
- No action required from a system-integrity standpoint. Owner review needed to clear the draft backlog.

_No code, database, settings, content, or external-system changes were performed. This plan is a report only — no build step is needed; you can decline it._
