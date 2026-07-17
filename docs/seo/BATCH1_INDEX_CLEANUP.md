# Batch 1 index cleanup

This release removes the functional Custom Lab route from the XML sitemap while keeping it usable with `noindex` headers, blocks retired blog URLs from returning the homepage, enforces the verified domain email in public HTML, and returns real 404 responses for unpublished or empty public route assets.

## Acceptance rules

- `/studio` is absent from the sitemap and receives `X-Robots-Tag: noindex`.
- Retired blog slugs are absent from sitemap/build output.
- Public HTML must contain `info@irhaapparels.com` and must not contain the owner Gmail address.
- A missing public route asset returns a true 404 rather than the homepage shell.
- Functional SPA tools remain available and are not accidentally converted to 404 pages.
