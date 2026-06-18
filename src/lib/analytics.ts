/**
 * Lightweight analytics utility for conversion tracking.
 * Automatically detects GA4 (gtag), GTM (dataLayer) or Plausible,
 * and falls back to console in development.
 */

type DownloadEvent = {
  page: string;
  cta_location: string;
  catalog: string;
};

function getPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search;
}

export function trackDownload(params: DownloadEvent): void {
  const event = {
    event: "download_catalog",
    page: params.page || getPath(),
    cta_location: params.cta_location,
    catalog: params.catalog,
  };

  // Google Analytics 4 (gtag)
  if (typeof window !== "undefined" && "gtag" in window) {
    // @ts-expect-error gtag is injected by GA4 script
    window.gtag?.("event", "download_catalog", {
      page: event.page,
      cta_location: event.cta_location,
      catalog: event.catalog,
    });
  }

  // Google Tag Manager (dataLayer)
  if (typeof window !== "undefined" && "dataLayer" in window) {
    // @ts-expect-error dataLayer is injected by GTM script
    window.dataLayer?.push(event);
  }

  // Plausible
  if (typeof window !== "undefined" && "plausible" in window) {
    // @ts-expect-error plausible is injected by Plausible script
    window.plausible?.("download_catalog", {
      props: {
        page: event.page,
        cta_location: event.cta_location,
        catalog: event.catalog,
      },
    });
  }

  // Console fallback so devs can verify locally
  // eslint-disable-next-line no-console
  console?.log?.("[Analytics] download_catalog", event);
}
