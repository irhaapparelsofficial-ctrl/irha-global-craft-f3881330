# Custom-Domain Release Guard — 2026-07-14

The Cloudflare production workflow now treats `irhaapparels.com` and `www.irhaapparels.com` as release-critical endpoints.

A deployment is not considered successful unless both domains serve:

- the exact GitHub source commit deployed to `irha-apparels.pages.dev`;
- the same deterministic build fingerprint;
- the owner Supabase project `pvzjiozismyxqrzmtfbi`;
- the buyer-safe homepage marker; and
- none of the blocked legacy fixed MOQ, delivery, response-time or certification claims.

The workflow remains non-mutating for DNS and custom-domain configuration. A mismatch fails visibly rather than silently reporting production success.
