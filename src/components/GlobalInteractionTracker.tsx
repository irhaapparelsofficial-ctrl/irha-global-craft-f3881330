import { useEffect } from "react";
import { currentPagePath, trackAnalyticsEvent } from "@/lib/analytics";

type Interaction = {
  name: string;
  parameters: Record<string, string | boolean>;
};

function sameOriginPath(anchor: HTMLAnchorElement): string | undefined {
  try {
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin !== window.location.origin) return undefined;
    return url.pathname;
  } catch {
    return undefined;
  }
}

export function classifyBuyerInteraction(target: Element): Interaction | null {
  const trackable = target.closest<HTMLElement>("a,button,[data-track]");
  if (!trackable) return null;

  const explicit = trackable.dataset.track;
  if (explicit) {
    return {
      name: explicit,
      parameters: { source_page: currentPagePath(), element_type: trackable.tagName.toLowerCase() },
    };
  }

  if (trackable instanceof HTMLButtonElement) {
    const label = trackable.textContent?.trim().toLowerCase() ?? "";
    if (label.includes("get full catalogue")) {
      return {
        name: "begin_catalogue_request",
        parameters: { source_page: currentPagePath(), element_type: "button" },
      };
    }
  }

  if (trackable instanceof HTMLAnchorElement) {
    const rawHref = trackable.getAttribute("href") ?? "";
    const href = rawHref.toLowerCase();
    const internalPath = sameOriginPath(trackable);

    if (href.startsWith("mailto:")) {
      return { name: "contact_email_click", parameters: { source_page: currentPagePath(), contact_channel: "email" } };
    }
    if (href.startsWith("tel:")) {
      return { name: "contact_phone_click", parameters: { source_page: currentPagePath(), contact_channel: "phone" } };
    }
    if (href.includes("wa.me") || href.includes("whatsapp.com")) {
      return { name: "contact_whatsapp_click", parameters: { source_page: currentPagePath(), contact_channel: "whatsapp" } };
    }
    if (internalPath === "/inquiry") {
      const url = new URL(trackable.href, window.location.origin);
      const intent = url.searchParams.get("intent") ?? "rfq";
      return {
        name: intent === "meeting" ? "begin_factory_call_request" : "begin_inquiry",
        parameters: { source_page: currentPagePath(), inquiry_intent: intent },
      };
    }
    if (internalPath?.endsWith("/spec-sheet")) {
      return { name: "view_spec_sheet", parameters: { source_page: currentPagePath(), destination_path: internalPath } };
    }
    if (internalPath?.startsWith("/catalogue/")) {
      return { name: "select_catalogue_collection", parameters: { source_page: currentPagePath(), destination_path: internalPath } };
    }
    if (href.includes("linkedin.com") || href.includes("facebook.com") || href.includes("instagram.com") || href.includes("tiktok.com")) {
      let network = "social";
      if (href.includes("linkedin.com")) network = "linkedin";
      else if (href.includes("facebook.com")) network = "facebook";
      else if (href.includes("instagram.com")) network = "instagram";
      else if (href.includes("tiktok.com")) network = "tiktok";
      return { name: "social_outbound_click", parameters: { source_page: currentPagePath(), social_network: network } };
    }
  }

  const aria = (trackable.getAttribute("aria-label") ?? "").toLowerCase();
  if (aria.includes("shortlist")) {
    return { name: "product_shortlist_toggle", parameters: { source_page: currentPagePath() } };
  }

  return null;
}

export default function GlobalInteractionTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const interaction = classifyBuyerInteraction(event.target);
      if (!interaction) return;
      trackAnalyticsEvent(interaction.name, interaction.parameters);
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
