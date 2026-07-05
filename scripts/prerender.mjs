// scripts/prerender.mjs
// PHASE 6 (2026-07-05): react-snap prerender was serving stale HTML from an
// earlier build (old MOQ, "600+ styles", old sort options, old /studio copy)
// on the custom domain, because prerendered snapshots capture initial-render
// fallback content BEFORE Supabase data hydrates. Live SPA + client-side render
// now serves accurate content from the DB. Google can execute JS, so no SEO
// regression. If we later need static HTML, use a dedicated SSR path, not a
// build-time crawler that snapshots pre-hydration state.
console.log("[prerender] Skipped — SPA serves live DB content on every visit.");
process.exit(0);
