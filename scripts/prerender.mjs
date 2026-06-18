// scripts/prerender.mjs
// Build-time prerender wrapper. Runs react-snap to crawl the dist/ SPA and
// emit static HTML for each route so Googlebot gets fully rendered HTML.
//
// Designed to NEVER fail the deploy: if Chromium / Puppeteer is unavailable
// in the hosting build environment, we log a warning and exit 0 so the SPA
// fallback (index.html) still ships.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["react-snap"], {
  stdio: "inherit",
  env: { ...process.env },
  shell: false,
});

if (result.status !== 0) {
  console.warn(
    "\n[prerender] react-snap did not complete (exit " +
      result.status +
      "). Continuing with client-rendered SPA fallback.\n"
  );
}
// Always exit 0 — prerender is a progressive enhancement.
process.exit(0);
