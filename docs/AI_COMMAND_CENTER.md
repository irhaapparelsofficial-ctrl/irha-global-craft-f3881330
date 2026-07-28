# Irha AI Command Center

## Purpose

Irha AI Command Center is an admin-only operating layer for Irha Apparels. It converts natural-language owner commands into structured business actions while preserving human approval for external writes.

The goal is not to display an AI chat box that claims work was completed. The goal is to create a traceable operating system where every plan, draft, approval, connector result and failure has a database record.

## First release capabilities

### Business-aware planning

The planner reads a limited current snapshot of:

- published products and categories
- recent website inquiries
- recent catalogue requests
- recent imported prospects
- recent social delivery outcomes
- the truthful business-listings registry

It knows the Irha Apparels rules:

- requirement-led B2B manufacturing; buyer verification through exact program scope
- factory view can be shown on a live video call
- no public pricing
- no invented MOQ, delivery, certification, review, buyer-count or platform-performance claims
- public content targets wholesalers, importers, distributors, retailers and private-label brands

### Structured action types

- social content pack
- approved social publish attempt
- lead-campaign plan
- approved listing-registry task
- buyer-reply draft
- multilingual SEO rollout plan
- weekly growth plan

### Approval controls

External writes are not executed directly from the model response.

The following require explicit owner approval:

- social publishing
- listing-registry changes

The executor stores the exact backend response. TikTok profile verification is never counted as a published TikTok post.

### Runtime health

The Connections tab separates:

- configured: a runtime key/secret is detected
- verified: a live identity check succeeded where supported
- publish-capable: the current inputs are sufficient to attempt publishing

Publish-capable is not a guarantee that a platform will accept the post.

### B2B listings registry

The former hard-coded listing cards and invented metrics were removed. The new registry stores only:

- platform
- real account/profile URL
- status
- verification level
- owner
- next action
- notes
- last verified timestamp

## Database tables

### `ai_runs`

One row per owner command, including its business-context snapshot and final response.

### `ai_actions`

One row per structured action, including approval state, payload, exact execution result and failure reason.

### `business_listings`

Truthful directory/marketplace account registry.

All three tables are protected by admin-only RLS.

## Current platform truth

- LinkedIn: connector exists; runtime health verifies identity where the connector key is available. Publishing records the exact API result.
- Facebook and Instagram: use Meta Graph secrets when present and verified. Missing IDs/tokens remain visible as missing.
- TikTok: current social backend verifies the connected profile only. Public direct posting remains disabled until the Content Posting API scope and audit are proven.
- Canva and HeyGen: connected in the Lovable workspace, but no production executor is claimed in this release.

## Next executor phases

1. Lead research executor using approved sources, deduplication and CRM import.
2. Gmail/Pipedrive outreach executor with approval, delivery status and follow-up logging.
3. Canva/HeyGen creative jobs for carousels and reels with asset review.
4. Scheduled content calendar with approval windows and retry/idempotency controls.
5. Multilingual SEO content workflow with native-quality review, hreflang and sitemap quality gates.
6. TikTok direct-post executor only after required scopes/audit and public-post tests.

## Definition of done for future executors

An executor is complete only when:

- connector/account identity is verified
- approval is required for external writes
- idempotency prevents duplicate work
- exact API result is stored
- failures are visible and retryable
- the UI never reports a draft or verification as a completed external action
