# Irha Apparels — Live Release Parity Audit

**Date:** 14 July 2026  
**Purpose:** Separate current GitHub source quality from the website version currently published through Lovable.

## Executive finding

The live public release is behind the current GitHub `main` source.

The published homepage still exposes an older marketing version containing fixed operational and compliance claims. The current source has already moved to safer requirement-led wording and an evidence-before-claims compliance model. This means the risky homepage text is primarily a **release parity problem**, not the intended current source state.

Do not use Lovable Update/Publish repeatedly while repair branches are still moving. Keep one final Lovable sync for the consolidated, green main branch.

## Live fetch findings

### Homepage

The currently published homepage includes claims such as:

- A fixed founding/since year.
- Fixed MOQ.
- Fixed worldwide delivery timing.
- A fixed reply deadline.
- Named certification/audit/compliance claims.
- An owned-factory/no-middleman claim.

These claims must not remain public unless each one has current, owner-approved evidence and the exact wording is accurate. The current GitHub source is more conservative and uses requirement-led review, quotation-based manufacturing and evidence-before-claims language.

### Products

The public products route returns the catalogue shell and buyer footer/navigation. The crawler did not fully render client-side product data, so this is not accepted as a complete visual or interaction test. Browser-level mobile/desktop acceptance remains P0.

### Inquiry

The public inquiry route renders a multi-step B2B intent flow for quote, sample, catalogue, reference upload and meeting requests. Submission, attachment, lead storage and admin visibility still require controlled end-to-end test records.

### Custom Lab

The live route exists but crawler output only exposed its loading shell. Independent backend verification is stronger here: the missing `generate-mockup` function was repaired, deployed to owner Supabase, and returned a real HTTP 200 with valid front/back PNG data.

### Contact and Terms

The crawler exposed loading shells. This is not proof of failure because the application is client-rendered. Browser acceptance remains required.

### Privacy alias

The direct `/privacy` path returned the site 404 page. The canonical application route is `/privacy-policy`. Compatibility redirects for `/privacy`, `/privacy/`, `/terms`, `/terms/` and `/terms-and-conditions` are added in the associated repair branch.

## Current source safeguards

Current main contains:

- Owner-controlled immutable Supabase runtime identity.
- Requirement-led buyer readiness copy.
- Program-specific MOQ, timing and pricing language.
- A compliance page that explicitly requires evidence before public claims.
- Canonical `/privacy-policy` and `/terms-of-service` routes.
- Public analytics excluded from admin/auth and gated by consent.
- A free deterministic Custom Lab renderer instead of a paid Lovable AI image dependency.

## Final Lovable update gate

Perform the one final Lovable update only when all of the following are true:

1. The exact latest GitHub main commit is known.
2. Required Quality Gate checks are green on the reviewed source.
3. No open P0 repair branch is intended for the release.
4. Current source contains no unsupported fixed MOQ, timing, certification, factory-ownership, delivery or response claims.
5. Policy aliases and buyer-critical routes are merged.
6. Owner Supabase project identity remains unchanged.
7. The owner is ready to press Lovable Update once.

After the update, verify:

- Homepage no longer exposes the old fixed claims.
- `/privacy` redirects to `/privacy-policy`.
- `/terms` redirects to `/terms-of-service`.
- `/studio` generates front/back previews.
- Inquiry/contact/catalogue routes load on iPhone and desktop.
- The published release matches the approved GitHub main source.

## Non-claim

A text crawler cannot certify visual layout, mobile breakpoints, JavaScript interaction, file upload, form submission, download behaviour or authenticated admin workflows. Those require controlled browser/device acceptance and backend evidence. The audit keeps those items open rather than claiming a false pass.
