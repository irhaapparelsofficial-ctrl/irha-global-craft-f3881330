export type ImageLoadState = "idle" | "requested" | "loading" | "loaded" | "failed";

export const CONTROLLED_IMAGE_FALLBACK = "/favicon.svg";

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
