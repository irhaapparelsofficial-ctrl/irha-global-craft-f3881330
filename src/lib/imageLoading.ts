export type ImageLoadState = "idle" | "requested" | "loading" | "loaded" | "failed";

const FALLBACK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500" role="img" aria-label="Image unavailable">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111820"/>
      <stop offset="1" stop-color="#090b0e"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9a7736" stop-opacity=".25"/>
      <stop offset=".5" stop-color="#d5ad4d" stop-opacity=".72"/>
      <stop offset="1" stop-color="#9a7736" stop-opacity=".25"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1500" fill="url(#bg)"/>
  <rect x="92" y="92" width="1016" height="1316" rx="34" fill="none" stroke="#d5ad4d" stroke-opacity=".18" stroke-width="3"/>
  <path d="M420 690h360M470 750h260" stroke="url(#line)" stroke-width="8" stroke-linecap="round"/>
  <circle cx="600" cy="565" r="64" fill="none" stroke="#d5ad4d" stroke-opacity=".35" stroke-width="7"/>
  <path d="M570 565h60M600 535v60" stroke="#d5ad4d" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/>
  <text x="600" y="845" text-anchor="middle" fill="#d8d1c5" font-family="Arial, sans-serif" font-size="34" letter-spacing="7">IMAGE UNAVAILABLE</text>
  <text x="600" y="905" text-anchor="middle" fill="#918b82" font-family="Arial, sans-serif" font-size="23" letter-spacing="3">PRODUCT DETAILS REMAIN AVAILABLE</text>
</svg>`;

export const CONTROLLED_IMAGE_FALLBACK = `data:image/svg+xml,${encodeURIComponent(FALLBACK_SVG)}`;

function sanitizedImagePath(source?: string | null) {
  if (!source) return "[missing-source]";
  if (/^(?:data|blob):/i.test(source)) return "[embedded-source]";

  try {
    const base = typeof window === "undefined" ? "https://irhaapparels.com" : window.location.origin;
    const url = new URL(source, base);
    const host = url.origin === base ? "" : `${url.hostname}`;
    return `${host}${url.pathname}` || "/";
  } catch {
    return source.split(/[?#]/, 1)[0].slice(0, 240) || "[invalid-source]";
  }
}

export function reportImageFailure(source?: string | null) {
  if (typeof window === "undefined") return;
  const path = sanitizedImagePath(source);
  window.dispatchEvent(new CustomEvent("irha:image-load-failed", { detail: { path } }));
  if (import.meta.env.DEV) console.warn(`[image-delivery] failed: ${path}`);
}
