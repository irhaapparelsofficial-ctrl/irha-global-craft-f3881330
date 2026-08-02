export const BRAND_ASSET_VERSION = "ia-brand-master-e001-20260802-32eee79b";

export const OFFICIAL_BRAND_MASTER = Object.freeze({
  path: "/brand/irha-apparels-official-master.png",
  sha256: "32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87",
  mimeType: "image/png",
  width: 1024,
  height: 1024,
  sizeBytes: 1023183,
});

const versioned = (path: string) => `${path}?v=${BRAND_ASSET_VERSION}`;
const OFFICIAL_RUNTIME_CREST = "/brand/irha-apparels-official-runtime-512.png";

export const BRAND_ASSETS = Object.freeze({
  master: versioned(OFFICIAL_BRAND_MASTER.path),
  headerLogo: versioned(OFFICIAL_RUNTIME_CREST),
  footerLogo: versioned(OFFICIAL_RUNTIME_CREST),
  controlledFallback: versioned(OFFICIAL_RUNTIME_CREST),
  faviconSvg: versioned("/favicon.svg"),
  favicon32: versioned("/favicon-32x32.png"),
  favicon48: versioned("/favicon-48x48.png"),
  appleTouchIcon: versioned("/apple-touch-icon.png"),
  icon192: versioned("/icon-192x192.png"),
  icon512: versioned("/icon-512x512.png"),
});
