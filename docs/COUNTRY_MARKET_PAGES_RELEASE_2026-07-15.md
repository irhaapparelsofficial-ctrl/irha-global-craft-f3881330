# Country Market Pages Release — 2026-07-15

## Public routes

- `/markets`
- `/markets/germany`
- `/markets/austria`
- `/markets/switzerland`
- `/markets/netherlands`
- `/markets/united-states`
- `/markets/united-kingdom`
- `/markets/canada`
- `/markets/australia`
- `/markets/new-zealand`

These market pages complement, rather than replace, the existing product-and-country buyer-intent pages on the site.

## Content contract

Each market page has a unique title, description, H1, introduction, product-program focus, three sourcing sections and at least four FAQs. The pages use only requirement-led commercial language:

- Irha Apparels is an experienced manufacturer in Sialkot, Pakistan.
- The current public website is newly built.
- A live factory video call is available for buyer verification.
- MOQ, price, production timing, shipping and documentation are confirmed after reviewing the actual requirement.

No fixed prices, universal MOQ, guaranteed delivery, ratings, customer counts, certification claims or destination-specific legal promises are published.

## Technical delivery

- Typed, version-controlled market data with no runtime database dependency.
- React hub and market routes with canonical URLs, country locale metadata, hreflang, WebPage/Service/FAQ structured data and B2B CTAs.
- Internal footer link to the market hub.
- Primary generated sitemap receives the hub and all nine market URLs.
- Build-time static crawler shells contain market-specific titles, descriptions, H1s and body text.
- Plain country aliases permanently redirect to canonical `/markets/*` routes.
- Existing specialized buyer-intent pages remain live.
- Markdown negotiation returns market-specific content for known pages and HTTP 404 for unknown pages.
- The Cloudflare worker returns a real HTTP 404 for unknown top-level and unknown market paths.

## Rollback

Original pre-work production checkpoint: `1da2b1e8e46be0e34751eb6e5e2934b5a08c8926`.

The feature was rebased onto the newer main branch before merge so parallel buyer-intent and admin notification work was preserved.

## Release gates

1. Typecheck.
2. Full Vitest suite.
3. Production build and crawler-shell verification.
4. Deployment-source, secret and migration-order checks.
5. Release identity and blocked-claim guards.
6. Post-deployment checks for pages, redirects, sitemap presence and real 404 behavior.
