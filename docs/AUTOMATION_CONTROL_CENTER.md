# Irha Apparels — Guarded Automation Control Center

## Purpose

This module prepares daily growth work for leads, multilingual SEO, B2B listings, social posts and reel briefs while keeping all commercial and public actions approval-controlled.

## Daily planning scope

- Evidence-based B2B lead discovery tasks by rotating market and product focus.
- Localized SEO draft tasks that remain `draft` and `noindex` until review.
- Internal B2B listing tasks; external platforms are never claimed changed without evidence.
- Social caption, hashtag, CTA and calendar draft tasks.
- Weekly reel/creative tasks with a Canva handoff requirement.

## Non-negotiable controls

- No automatic prospect email.
- No automatic CRM import.
- No automatic public social publish.
- No automatic external listing change.
- No automatic SEO publish.
- No price, discount, MOQ, payment term, production timeline, delivery or shipping commitment.
- Business Rules must be complete, current and owner-approved before any guarded operate-mode action.

## Database objects

- `automation_settings`
- `automation_runs`
- `automation_tasks`
- `create_automation_planning_cycle(text)`
- `automation_planning_cycle_due()`
- scheduled job: `irha-daily-automation-planning`

## Default schedule

- Timezone: `Asia/Karachi`
- Daily planning target: `08:30`
- Lead candidates: up to 20/day
- SEO drafts: up to 2/day
- Listing tasks: up to 3/day
- Social drafts: up to 2/day
- Reel targets: 3/week

## Canva boundary

The deployed Supabase runtime cannot directly call the Canva MCP connector. Therefore the database stores a Canva creative task and handoff evidence. The connected ChatGPT/Canva workflow creates or edits the actual Canva draft and records the design reference. No fake factory scene or altered product design is allowed; only verified Irha product/factory media may be used.

## Activation

Apply migrations in chronological order. Verify RLS, policies, function execute grants and the cron job. Do not enable unattended public publishing as part of activation.
