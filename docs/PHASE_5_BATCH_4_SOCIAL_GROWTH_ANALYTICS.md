# Phase 5.4 — Verified Social Growth Analytics

## Purpose

Turn exact social-platform evidence into an owner-friendly growth dashboard without inventing reach, leads, revenue, customer intent or successful external actions.

## Admin workflow

1. Publish only through the Phase 5.3 owner-approved scheduler.
2. Collect exact platform metrics for posts that already have a real external post ID or HTTPS URL.
3. Preserve immutable metric snapshots with source, timestamp and raw evidence.
4. Add deterministic UTM tracking links for future post revisions.
5. Review platform summaries and observed post rankings.
6. Generate internal optimization recommendations from verified evidence.
7. Approve, dismiss or complete recommendations. Approval creates internal work only; it never publishes a post.
8. When APIs are unavailable, enter a manual metric snapshot only with an evidence note retained by the owner.

## Backend source prepared

- `social_metric_snapshots`
- `social_attribution_events`
- `social_growth_recommendations`
- UTM and metric-collection fields on `social_calendar_items`
- latest verified social-growth view
- admin tracking, manual metric and recommendation-status RPCs
- `social-analytics` Edge Function

The migration and Edge Function are repository source only until final backend activation.

## Evidence rules

- Only `published` items with an external post ID or HTTPS URL are eligible.
- API collection stores the exact provider source and raw response.
- Manual snapshots require an explicit evidence note.
- Engagement ranking is deterministic observed evidence, not sales or order probability.
- Attribution remains zero until real tracked landing or lead events exist.
- Missing or stale evidence is shown as missing/stale, never as zero performance.

## Optimization actions

The system may prepare internal recommendations for:

- collecting missing metrics;
- refreshing stale snapshots;
- improving a CTA when engagement exists but verified clicks do not;
- preparing a new platform-native draft from a comparatively strong evidence angle;
- reviewing missing tracking.

It does not auto-create claims, publish content, spend advertising budget or change commercial terms.

## Final activation requirements

1. Apply repository migrations in order through `20260713193000_social_growth_analytics.sql`.
2. Deploy `social-analytics` after `social-publish-scheduler`.
3. Configure only the analytics credentials actually approved for use:
   - Meta access token and explicit graph version;
   - optional generic analytics gateway URL/secret;
   - LinkedIn/TikTok analytics permissions only after platform approval.
4. Run health checks.
5. Collect one verified post snapshot and compare it with the platform dashboard.
6. Test duplicate snapshot protection and manual evidence validation.
7. Keep unattended analytics collection disabled until exact results are verified.

## Not performed in this batch

- No migration was applied.
- No Edge Function or secret was deployed.
- No platform analytics permission was granted.
- No social post was created, edited or published.
- No advertisement was created or funded.
- No production website publish was performed.
