# Phase 2 / Batch 2.4 — Global Website Controls & Media Library

## Delivered frontend

Admin → **Website Editor** is now a control center with three workspaces:

1. **Global Settings** — brand identity, logo URL, business contact details, WhatsApp number, main/more/tail navigation, shared quote/mockup/studio CTAs, social links, footer collections/company links, buyer-readiness statements and custom/seasonal announcement mode.
2. **Homepage** — the existing protected hero draft/publish/revision editor.
3. **Media Library** — upload, catalogue, search, tag, archive, copy public URL and permanently delete reusable website images, videos and PDFs.

## Buyer-facing integration

Published global settings are consumed by:

- desktop and mobile navigation;
- header logo and shared quote/mockup buttons;
- footer brand/contact/social/collection/company/readiness content;
- Contact page business details and social links;
- seasonal/custom announcement banner;
- desktop floating AI/WhatsApp actions;
- mobile sticky Quote/WhatsApp bar.

Every consumer retains the verified committed settings as a fallback when the database/RPC is unavailable or the final migration has not yet been activated.

## Backend prepared, not applied

Migration: `20260713030000_global_site_settings_and_media.sql`

It prepares:

- a seeded `site.global.settings` CMS document using the generic draft/publish/revision engine from Batch 2.1;
- `media_assets` with admin-only RLS;
- append-only `media_asset_events` audit history;
- safe updated-at/actor triggers;
- public `site-media` bucket with a 25 MB limit and an explicit MIME allow-list;
- admin-only storage insert/update/delete policies.

Per owner instruction, no database was contacted or modified during this batch. The migration remains versioned for the single final backend activation after all phases are complete.

## Safety controls

- public settings accept internal routes only for site navigation and CTAs;
- logo/social media accept internal or HTTPS URLs only;
- WhatsApp is normalized to digits with country code;
- custom announcement date order is validated;
- drafts do not change live content;
- media upload type and size are checked in both frontend and database/storage definitions;
- permanent media deletion requires explicit confirmation;
- missing backend schema never blanks or breaks the public website.

## Phase 2 completion definition

Phase 2 code is complete when this batch passes typecheck, tests, production build and the production-claims guard. Final database activation and production Publish remain deferred until the owner-approved one-time migration stage.
