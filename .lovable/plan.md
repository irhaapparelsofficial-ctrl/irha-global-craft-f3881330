# Unblock build, then resume audit

## Root cause

`scripts/patch-german-bavarian-shell.mjs` unconditionally reads `dist/de/bavarian-wear/index.html`. That URL is no longer emitted by the sitemap-driven shell generator (0 occurrences in `public/sitemap.xml`), so the file is never created and the postbuild step crashes with ENOENT.

Two other scripts already ran cleanly:
- `Generated 398 route-specific static HTML shells from sitemap.xml`
- `Finalized 86 canonical taxonomy product shells; legacy verifier URL removed from sitemap`

So `/de/bavarian-wear` was intentionally retired from the sitemap; only this patch script wasn't updated.

## Fix (one file, ~4 lines)

Edit `scripts/patch-german-bavarian-shell.mjs`:

1. Wrap the `readFile` call in a try/catch on `ENOENT`.
2. If the file is missing, log `Skipped: /de/bavarian-wear shell not present in sitemap` and `process.exit(0)`.
3. Keep the strict `throw` for the metadata-patch-failed case (that's a real regression signal).

No code changes to the sitemap, the shell generator, taxonomy, DB, or any product data. No new German page is added or removed — this only stops the postbuild from crashing on an intentionally-absent shell.

## Verify

- `npm run build` completes green.
- Grep confirms no other script depends on `dist/de/bavarian-wear/`.

## After the build is green

Resume the audit-plan I owe you (owner-Supabase probe → live counts → 8-PR sequenced plan per your answers). I will NOT start that in the same turn — build fix ships alone, then I return with the real audit plan in the next turn.

## Out of scope for this turn

- Taxonomy, products, media, Admin, SEO, PR #1 audit — all deferred to the follow-up plan.
- Reintroducing `/de/bavarian-wear` as a live route (would need sitemap + shell decision from you first).
