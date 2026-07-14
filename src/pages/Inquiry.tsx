import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import InquiryBase from "@/pages/InquiryBase";
import { trackLeadGenerated } from "@/lib/analytics";
import {
  loadDraft,
  saveDraft,
  type InquiryDraft,
  type InquiryIntent,
} from "@/lib/inquiryDraft";

function validIntent(value: string | null): value is InquiryIntent {
  return Boolean(value) && ["rfq", "sample", "catalogue", "reference", "meeting"].includes(value as string);
}

function listParam(params: URLSearchParams, key: string): string[] | undefined {
  const values = (params.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

function intentFromSuccessScreen(container: Element, fallback: InquiryIntent): InquiryIntent {
  const whatsapp = container.querySelector<HTMLAnchorElement>('a[href*="wa.me"]');
  if (!whatsapp) return fallback;
  try {
    const text = new URL(whatsapp.href).searchParams.get("text") ?? "";
    const label = text.match(/Intent:\s*([^\n]+)/i)?.[1]?.trim().toLowerCase();
    if (label === "request sample") return "sample";
    if (label === "request catalogue") return "catalogue";
    if (label === "upload reference") return "reference";
    if (label === "request meeting") return "meeting";
    if (label === "request quote") return "rfq";
  } catch {
    // A malformed follow-up link must never affect the completed inquiry.
  }
  return fallback;
}

export default function Inquiry() {
  const [searchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const trackedSuccessRef = useRef(false);

  const prefilledEntry = useMemo(() => {
    const params = new URLSearchParams(queryKey);
    const intent = params.get("intent");
    if (!validIntent(intent)) return false;

    const stored = loadDraft();
    const incomingContext: NonNullable<InquiryDraft["productContext"]> = {
      productSlug: params.get("product") ?? undefined,
      productName: params.get("name") ?? undefined,
      categorySlug: params.get("category") ?? undefined,
      shortlistSlugs: listParam(params, "shortlist"),
      shortlistNames: listParam(params, "names"),
      compareSlugs: listParam(params, "compare"),
      compareNames: listParam(params, "compareNames"),
    };
    const hasIncomingContext = Object.values(incomingContext).some((value) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value),
    );
    const storedStep = Math.max(1, Math.min(5, Number(stored?.step) || 1));
    const nextStep =
      !stored || stored.intent !== intent || hasIncomingContext ? 2 : Math.max(2, storedStep);

    saveDraft({
      ...(stored ?? {}),
      step: nextStep,
      intent,
      files: stored?.files ?? [],
      productContext: hasIncomingContext ? incomingContext : stored?.productContext,
    });

    return true;
  }, [queryKey]);

  useEffect(() => {
    const params = new URLSearchParams(queryKey);
    const fallbackIntent = validIntent(params.get("intent")) ? (params.get("intent") as InquiryIntent) : "rfq";

    const detectSuccess = () => {
      if (trackedSuccessRef.current) return true;
      const heading = [...document.querySelectorAll("h2")].find(
        (element) => element.textContent?.trim().toLowerCase() === "inquiry received",
      );
      if (!heading) return false;

      const container = heading.closest("div") ?? heading;
      const intent = intentFromSuccessScreen(container, fallbackIntent);
      trackLeadGenerated({
        leadType: intent,
        formName: "inquiry_wizard",
        sourcePage: `${window.location.pathname}${window.location.search}`,
        category: params.get("category"),
        productSlug: params.get("product"),
        intentDetail: intent === "meeting" ? "factory-video-call" : "completed-inquiry",
      });
      trackedSuccessRef.current = true;
      return true;
    };

    if (detectSuccess()) return;
    const observer = new MutationObserver(() => {
      if (detectSuccess()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [queryKey]);

  return (
    <div className={prefilledEntry ? "irha-prefilled-inquiry" : undefined}>
      {prefilledEntry && (
        <style>{`.irha-prefilled-inquiry section:first-of-type .container-luxe > p[class*="text-foreground/60"] { display: none; }`}</style>
      )}
      <InquiryBase />
    </div>
  );
}
