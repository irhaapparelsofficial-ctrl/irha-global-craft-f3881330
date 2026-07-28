# Social Autopilot Approval Queue v2

## Outcome

The Social Posts admin now has one owner-controlled workflow:

1. **Dry run** — preview which products, platforms, formats, dates and media state the system would choose.
2. **Prepare next 7 days** — create a single idempotent weekly campaign containing drafts only.
3. **Review** — inspect product choice, category, caption, hashtags, CTA, source-media reason, visual preset, proposed Pakistan-time schedule and render status.
4. **Final clearance** — Daim edits, approves, rejects or schedules each draft in the existing Social Calendar.
5. **Delivery** — only already-approved, due items may enter the existing verified delivery adapters. A failed/manual result is never shown as published.

There is no automatic public posting in v2 without explicit owner approval.

## Product and media selection

The weekly worker:

- uses only published products;
- excludes products used inside the configured cooldown window;
- rotates categories before repeating a category;
- prioritises products linked to active, verified and `social_approved` Media Library assets;
- records the product-selection and media-selection reason in every draft;
- never fabricates a media URL;
- marks the draft `media_generation_required`/`asset_required` when verified media is unavailable.

A verified Media Library asset is linked to a product when its tags contain the product UUID or product slug, or its public URL exactly matches the published product image URL.

## Locked brand visual preset

All image, carousel and reel briefs use `irha-premium-b2b-v1`:

- dark charcoal-to-navy seamless studio background;
- restrained gold accents;
- official Irha Apparels crest in the top-right only;
- product-only composition, no model or mannequin;
- consistent lighting and framing;
- 4:5 image/carousel output;
- 9:16 reel output;
- exactly 10 seconds with five 2-second scenes;
- no invented labels, logos, certifications, clients, prices, MOQ, materials, delivery or production claims.

The preset is stored in code and in `social_autopilot_settings.visual_preset`. Saving admin settings always restores the controlled preset instead of accepting an arbitrary prompt.

## Content truth rules

Copy may state only the approved company facts:

- experienced apparel manufacturer in Sialkot, Pakistan;
- buyer verification should focus on the exact program, team and written scope;
- OEM, ODM, private-label and custom manufacturing;
- scheduled live factory video call is available;
- quotation follows buyer requirement review;
- no public pricing.

Copy must not invent MOQ, price, capacity, certification, client, review, order, material, lead time, shipping promise or successful external action.

## Platform truth

- **LinkedIn:** can be `publish_capable` only when the existing connector health proves it.
- **Facebook / Instagram:** remain credentials-required until Meta Page and Instagram Business credentials are present and health proves capability.
- **TikTok:** profile verification alone remains `manual_required`; it is never treated as Content Posting API permission or a published post.
- **Carousel / Reel:** draft/render preparation is separate from delivery. A render job cannot enter the renderer queue before owner approval and output verification.

## Database objects

Migration: `20260714150000_social_autopilot_approval_queue_v2.sql`

- `social_autopilot_settings` — singleton planning policy; disabled by default.
- `social_autopilot_runs` — one idempotent preview or prepared run per week/settings fingerprint.
- `social_autopilot_events` — preparation, selection, media, render, approval-related and failure audit events.

The worker continues to use the existing:

- `social_campaigns`
- `social_calendar_items`
- `social_delivery_attempts`
- `media_assets`
- `social_render_jobs`
- `social_render_job_items`

It does not create a competing social calendar.

## Activation order

Apply only from a green, reviewed commit and validate after each step.

1. Confirm deployment source is the owner repository and latest green branch/commit.
2. Apply `20260713030000_global_site_settings_and_media.sql` if Media Library is not yet active.
3. Apply `20260713170000_social_media_render_pipeline.sql`.
4. Apply `20260713170100_media_social_verification_guard.sql`.
5. Apply `20260714150000_social_autopilot_approval_queue_v2.sql`.
6. Deploy `social-autopilot` with JWT verification enabled.
7. Open Admin → Social Posts and run **Dry run** first.
8. Verify the selected products, media state, platform truth and proposed schedule.
9. Run **Prepare next 7 days**.
10. Review/edit every draft. Approve only items with correct facts and final media.

Do not apply the render migrations before the base Media Library migration because the render migration alters `media_assets`.

## Secrets and connections

Required to generate copy:

- `LOVABLE_API_KEY`
- optional `SOCIAL_CONTENT_MODEL`

Required for a real render provider (not included or claimed by this change):

- `SOCIAL_RENDER_PROVIDER`
- `SOCIAL_RENDER_API_URL`
- `SOCIAL_RENDER_API_KEY`
- provider callback secret required by the existing renderer implementation

Required for direct platform delivery are documented in `SOCIAL_CONTENT_CALENDAR.md`. The autopilot does not weaken or bypass those checks.

## Current limitations

- The code prepares render drafts; it does not invent a renderer connection.
- If the Media Library/render migrations are not active, the admin shows **backend activation required** and media work remains blocked for review.
- A product needs verified social media linked by tags/URL before automatic source-media selection.
- TikTok remains manual until Content Posting API scope and audit are proven.
- Unattended automatic publication is not enabled by this feature.
- The existing v1 database guard keeps carousel/reel calendar items in draft/manual states until native delivery is separately implemented and verified.

## Failure resistance

- Settings are normalised and bounded.
- Weekly runs use a stable week key plus settings fingerprint.
- Re-running the same week/settings returns the existing run instead of duplicating drafts.
- Calendar rows use deterministic idempotency keys.
- Missing media/render tables degrade to blocked drafts rather than errors or fake URLs.
- Render jobs start in `draft`; they do not auto-queue.
- All generated calendar items start in `draft`, even when a proposed schedule is attached.
- Exact platform delivery results remain in the existing delivery-attempt log.

## Rollback

Application rollback:

1. Disable planning in the admin settings.
2. Revert the feature commit/PR.
3. Redeploy the prior green frontend and functions.

Data rollback (optional, only after backup):

- Keep the three autopilot tables for audit history; they are harmless when the function/UI is removed.
- To cancel one generated week, set its draft calendar items to `cancelled` and its run to `cancelled`.
- Do not delete published delivery records or verification evidence.
- Do not drop Media Library/render tables when other admin features use them.

## Acceptance checks

- TypeScript/build succeeds.
- Unit tests prove cooldown/category rotation, preset propagation, five-scene reel contract, weekly identity and TikTok truth.
- Dry run creates no campaign, calendar item, render job, approval or post.
- Prepare creates only draft calendar items.
- A second prepare with the same week/settings creates no duplicates.
- Missing verified media produces a blocked media-required draft and no URL.
- TikTok profile verification never becomes `published`.
- Bulk/individual approval remains an explicit owner action in the existing Social Calendar.
