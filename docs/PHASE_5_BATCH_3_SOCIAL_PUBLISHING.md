# Phase 5.3 — Verified Social Publishing & Scheduler

## Purpose

Connect approved social content and verified rendered assets to platform delivery without ever treating a draft, queue state, profile check or API attempt as a published post.

## Admin workflow

1. Create and approve content in Social Calendar.
2. Render reels/carousels through the verified Media Library pipeline.
3. Attach the verified render output to the calendar item.
4. Verify the platform connection and explicitly enable that account.
5. Record separate owner approval for public publication.
6. Choose manual or automatic delivery and an optional scheduled time.
7. Run the due queue manually or invoke the scheduler with its private secret.
8. Review the exact external post ID/URL, failure and immutable attempt history.

Content approval and public publication approval are deliberately separate.

## Backend source prepared

- `social_platform_accounts`
- `social_publish_runs`
- `social_publish_events`
- scheduling, lock, retry and render-source fields on `social_calendar_items`
- admin RPCs for render attachment and public approval
- service-only RPCs for atomic claiming, completion and failure
- `social-publish-scheduler` Edge Function

The migration and Edge Function are committed as source only. They are not activated by the repository merge.

## Delivery behavior

- Facebook: text/link, single image and verified video adapter when exact Meta credentials and Graph version are configured.
- Instagram: single image and verified reel adapter when exact Business credentials and Graph version are configured.
- LinkedIn: current verified connector path for supported text/article delivery.
- TikTok: profile verification only until Content Posting permission is proven; it cannot be marked published.
- Optional generic publish gateway: supports a separately deployed provider only when it returns valid result states and real publication evidence.

Unsupported formats become `manual_required`; they are not mislabeled as successful.

## Safety controls

- Admin authentication is required for health details and manual execution.
- Scheduler execution requires a private `SOCIAL_SCHEDULER_SECRET`.
- Browser admins cannot claim/complete jobs or write immutable attempt evidence.
- Automatic processing requires both content approval and owner public-publication approval.
- Verified platform account and format capability are required.
- Reel/carousel delivery requires verified render evidence.
- Queue rows are claimed with `FOR UPDATE SKIP LOCKED` and a time-limited delivery lock.
- Retries use bounded backoff and stop at the configured maximum.
- `published` requires a real external post ID or HTTPS post URL.
- Tokens and secrets are never stored in database account rows or frontend source.

## Final activation requirements

1. Apply repository migrations in order through `20260713180000_social_publishing_scheduler.sql`.
2. Deploy `social-render-worker`, `social-render-callback` and `social-publish-scheduler`.
3. Configure only the required backend secrets:
   - `SOCIAL_SCHEDULER_SECRET`
   - exact platform credentials for approved accounts
   - explicit `META_GRAPH_VERSION` for Meta adapters
   - optional publish gateway URL/secret
4. Invoke admin health checks and verify platform identity before enabling an account.
5. Create one non-public test/draft workflow, then use an owner-approved real post as the first production evidence test.
6. Do not enable unattended scheduling until the first exact post result and duplicate-safe retry behavior are verified.

## Not performed in this batch

- No migration was applied.
- No Edge Function or secret was deployed.
- No platform connection was enabled.
- No reel or carousel was rendered.
- No social post was published.
- No production website publish was performed.
