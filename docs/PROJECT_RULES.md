# Irha Apparels — Production Guardrails

These rules are non-negotiable for every change to this repository.

## Business model

- Irha Apparels is a B2B custom apparel manufacturer, not a consumer store.
- Do not add public prices, checkout, automatic quotations, binding discounts, shipping prices, or delivery promises.
- Final feasibility, materials, construction, pricing, MOQ, sample cost, shipping and timeline are confirmed only after requirement review.

## Source of truth

- Lovable Cloud / Supabase database is the public catalog source of truth.
- Do not create a second static product or category system.
- Approved taxonomy is exactly 5 published main categories, 20 subcategories and 64 products unless the owner explicitly approves a migration.
- Public hierarchy: Main Category → Subcategory → Product.

## Canonical categories

1. Bavarian & Trachten Wear
2. Premium Leather Apparel
3. Sportswear
4. Streetwear & Activewear
5. Leisure & Nightwear

## Truth and claims

- Never publish unverified certifications, audit status, export history, customer counts, fixed response times, fixed MOQs or fixed production timelines.
- Remove legacy claims instead of rephrasing them as proof.
- Capability language is allowed only when it describes a service that can genuinely be reviewed and confirmed per program.

## Public UX

- Preserve the current homepage structure unless the owner explicitly requests a redesign.
- Do not restore sections the owner intentionally removed.
- Avoid duplicate sections that explain the same capability.
- Mobile global actions: Get Quote + WhatsApp, with at most one contextual AI control.
- Global controls must not cover cookie UI, forms, product controls or each other.
- `/studio` is the customer-facing concept mockup tool and must remain non-binding.

## Conversion architecture

- `/inquiry` is the unified lead-conversion engine.
- Supported intents: RFQ, sample, catalogue, reference/tech pack and meeting.
- Preserve product, shortlist, compare, Studio and UTM context.
- Do not create duplicate lead tables or duplicate inquiry systems.
- Uploaded inquiry files remain private; public file URLs are not allowed.

## Admin and security

- `/admin` is publicly reachable only as a protected authentication entry point.
- No admin data may render before authentication and admin-role verification.
- Do not advertise the admin route in public buyer navigation.
- Do not weaken RLS, storage access or authentication to make a feature easier to build.

## Change discipline

Before editing:

1. Read the current implementation and related routes/components.
2. Search for every affected entry point and duplicate implementation.
3. Preserve working behavior unless the task explicitly changes it.
4. Prefer extending the existing architecture over creating a parallel one.

Before declaring complete:

1. Review the exact diff.
2. Check regression risk.
3. Check mobile overlap and safe-area behavior.
4. Check URL/context preservation.
5. Check truth/claims.
6. Check database and security impact.
7. Run TypeScript and production build when tooling is available.
8. Verify the actual custom domain when deployment tooling is available.

If a requirement cannot be verified, report `NOT VERIFIED` instead of `PASS`.
