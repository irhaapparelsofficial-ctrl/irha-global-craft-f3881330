# Public runtime and LCP optimization — 2026-07-15

This change keeps the route-specific static HTML visible while the initial Home or Germany buyer-intent route module downloads. The shell is replaced only after the critical module has loaded (or a bounded timeout has elapsed) and the browser has received a paint opportunity.

Admin CRM launchers, realtime listeners and admin-only mobile CSS are grouped in a dynamically imported `AdminRuntime` module that is mounted only under `/admin` routes. Public buyer and SEO pages no longer import those modules through the application entry point.

No product data, buyer records, DNS, pricing, catalogue content or Search Console property settings are changed by this patch.
