const CONSENT_KEY = "irha_cookie_consent_v1";

export const GOOGLE_ANALYTICS_ID = "G-RV39YH4CPF";
export const GOOGLE_ADS_CATALOGUE_CONVERSION = "AW-18279003993/K0wJCMiF7sYcENnujYxE";

type ConsentCategories = {
  analytics: boolean;
  ads: boolean;
};

type EventValue = string | number | boolean | null | undefined;
export type AnalyticsParameters = Record<string, EventValue>;

type DownloadEvent = {
  page: string;
  cta_location: string;
  catalog: string;
};

function readConsent(): ConsentCategories {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { analytics: false, ads: false };
    const parsed = JSON.parse(raw) as { categories?: Partial<ConsentCategories> };
    return {
      analytics: parsed.categories?.analytics === true,
      ads: parsed.categories?.ads === true,
    };
  } catch {
    return { analytics: false, ads: false };
  }
}

function cleanParameters(parameters: AnalyticsParameters): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized) continue;
      cleaned[key] = normalized.slice(0, 100);
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

function canSend(category: keyof ConsentCategories): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function" && readConsent()[category];
}

export function trackAnalyticsEvent(name: string, parameters: AnalyticsParameters = {}): boolean {
  if (!canSend("analytics")) return false;
  try {
    window.gtag?.("event", name, {
      ...cleanParameters(parameters),
      send_to: GOOGLE_ANALYTICS_ID,
    });
    return true;
  } catch {
    return false;
  }
}

export function trackAdsConversion(sendTo: string, parameters: AnalyticsParameters = {}): boolean {
  if (!canSend("ads")) return false;
  try {
    window.gtag?.("event", "conversion", {
      ...cleanParameters(parameters),
      send_to: sendTo,
    });
    return true;
  } catch {
    return false;
  }
}

export function trackLeadGenerated({
  leadType,
  formName,
  sourcePage,
  country,
  category,
  productSlug,
  intentDetail,
  adsSendTo,
}: {
  leadType: string;
  formName: string;
  sourcePage?: string | null;
  country?: string | null;
  category?: string | null;
  productSlug?: string | null;
  intentDetail?: string | null;
  adsSendTo?: string;
}): void {
  const parameters = {
    lead_type: leadType,
    form_name: formName,
    source_page: sourcePage ? normalizePagePath(sourcePage) : currentPagePath(),
    destination_country: country,
    product_category: category,
    product_slug: productSlug,
    intent_detail: intentDetail,
  };

  trackAnalyticsEvent("generate_lead", parameters);
  trackAnalyticsEvent("lead_form_submitted", parameters);
  if (adsSendTo) trackAdsConversion(adsSendTo, { lead_type: leadType });
}

export function normalizePagePath(value: string): string {
  const raw = (value || "/").split("?")[0].split("#")[0];
  if (!raw || raw === "/") return "/";
  const normalized = raw.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return (normalized.startsWith("/") ? normalized : `/${normalized}`).slice(0, 200);
}

export function currentPagePath(): string {
  if (typeof window === "undefined") return "/";
  return normalizePagePath(window.location.pathname);
}

export function trackDownload(params: DownloadEvent): void {
  trackAnalyticsEvent("download_catalog", {
    page: normalizePagePath(params.page || currentPagePath()),
    cta_location: normalizePagePath(params.cta_location),
    catalog: params.catalog,
  });
}
