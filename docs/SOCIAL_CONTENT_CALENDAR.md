# Irha Social Content & Calendar Engine v1

## Purpose

Create platform-native B2B social content from verified Irha Apparels product/business facts, keep every delivery behind admin approval, and store exact platform results.

## Workflow

1. Select a published product or create a general manufacturing-capability campaign.
2. Choose target markets, language, platforms, content types and posts per platform.
3. Lovable AI creates separate Facebook, Instagram, LinkedIn and TikTok drafts.
4. Review captions, hashtags, CTAs, carousel outlines, reel scripts and risk flags.
5. Attach a public final image or video URL where required.
6. Approve immediately or approve with a scheduled date/time.
7. Use `Publish due now` or explicitly select approved items for delivery.
8. Store exact connector/API response, external post ID/URL, failure and attempt history.

Generation never approves, schedules or publishes content.

## Platform truth

### Facebook

The worker can attempt Page delivery when Meta Page credentials are available. Exact Graph API response decides whether the item is published or failed.

### Instagram

V1 supports approved single-image posts with a public image URL. Carousel and reel assets are not claimed as automatically rendered or delivered.

### LinkedIn

The connected LinkedIn app connector is verified at runtime and can attempt article/text delivery. Exact response and post identifier are stored.

### TikTok

V1 verifies the connected profile only. It does not claim public posting until TikTok Content Posting API permissions and audit are proven. TikTok items finish as `verified_only` or `manual_required`, never `published` from profile verification.

## Canva and HeyGen

The workspace Canva and HeyGen connections are MCP chat connectors used by Lovable while building. They are not bundled into the deployed admin runtime.

The engine therefore creates copyable handoff briefs containing:

- visual direction
- format and aspect ratio
- on-screen text
- required source assets
- carousel slide outline
- reel scene script
- approved caption and CTA
- product URL

It does not claim that Canva designs or HeyGen videos were generated. Runtime automation requires a separate supported app connector, direct API integration with backend secrets, or an approved workflow gateway.

## Database

### `social_campaigns`

Campaign brief, selected product/markets/platforms and aggregate counts.

### `social_calendar_items`

One platform-specific content item with caption, creative brief, assets, schedule, approval, exact delivery result and retry state.

### `social_delivery_attempts`

One immutable attempt record per delivery action, including request snapshot, response snapshot and failure.

All tables use admin-only RLS.

## Approval and scheduling

- AI generation creates drafts only.
- Editing a draft and saving it as draft clears approval.
- A final public asset is required before approving Instagram image content or reel content.
- Approved items may have a future `scheduled_at` time.
- `Publish due now` processes only approved items whose scheduled time has arrived.
- V1 does not claim an unattended cron. Calendar scheduling is stored and can be processed from admin.
- Failed items can be retried only while their original approval remains present.

## Delivery limits

- Up to 28 AI-generated calendar items per request.
- Up to 10 irreversible delivery attempts per admin action.
- Published, verified-only and manual-required items are not re-published.

## Business truth rules

Content may state:

- Irha Apparels is an experienced apparel manufacturer in Sialkot, Pakistan.
- The website is newly built; the company is not new.
- A live factory video call is available.
- OEM, ODM, private-label and custom manufacturing are available.
- Buyers can request a tailored quote after requirement review.

Content must not invent prices, MOQ, delivery dates, certifications, customer names, orders, reviews, performance metrics or successful external posts.
