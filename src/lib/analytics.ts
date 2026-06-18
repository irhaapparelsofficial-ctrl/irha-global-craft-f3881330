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

  if (typeof window !== "undefined") {
    window.gtag?.("event", "download_catalog", {
      page: event.page,
      cta_location: event.cta_location,
      catalog: event.catalog,
    });

    window.dataLayer?.push(event);

    window.plausible?.("download_catalog", {
      props: {
        page: event.page,
        cta_location: event.cta_location,
        catalog: event.catalog,
      },
    });

    // Console fallback so devs can verify locally
    // eslint-disable-next-line no-console
    console.log("[Analytics] download_catalog", event);
  }
}
