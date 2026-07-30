export const BRAND_ASSET_VERSION = "ia-media-e001-20260730";

const versioned = (path: string) => `${path}?v=${BRAND_ASSET_VERSION}`;

export const BRAND_ASSETS = Object.freeze({
  headerLogo: versioned("/irha-brand-mark.svg"),
  footerLogo: versioned("/irha-brand-mark.svg"),
  controlledFallback: versioned("/irha-brand-mark.svg"),
  faviconSvg: versioned("/favicon.svg"),
  favicon32: versioned("/favicon-32x32.png"),
  favicon48: versioned("/favicon-48x48.png"),
  appleTouchIcon: versioned("/apple-touch-icon.png"),
  icon192: versioned("/icon-192x192.png"),
  icon512: versioned("/icon-512x512.png"),
});
