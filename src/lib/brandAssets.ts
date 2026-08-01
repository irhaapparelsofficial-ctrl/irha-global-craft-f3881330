export const BRAND_ASSET_VERSION = "ia-brand-visual-e001-20260801";

const versioned = (path: string) => `${path}?v=${BRAND_ASSET_VERSION}`;
const OFFICIAL_OWNER_CREST = "/favicon.svg";

export const BRAND_ASSETS = Object.freeze({
  headerLogo: versioned(OFFICIAL_OWNER_CREST),
  footerLogo: versioned(OFFICIAL_OWNER_CREST),
  controlledFallback: versioned(OFFICIAL_OWNER_CREST),
  faviconSvg: versioned("/favicon.svg"),
  favicon32: versioned("/favicon-32x32.png"),
  favicon48: versioned("/favicon-48x48.png"),
  appleTouchIcon: versioned("/apple-touch-icon.png"),
  icon192: versioned("/icon-192x192.png"),
  icon512: versioned("/icon-512x512.png"),
});
