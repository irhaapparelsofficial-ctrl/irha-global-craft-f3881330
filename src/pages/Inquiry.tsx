import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import InquiryBase from "@/pages/InquiryBase";
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

export default function Inquiry() {
  const [searchParams] = useSearchParams();
  const queryKey = searchParams.toString();

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

  return (
    <div className={prefilledEntry ? "irha-prefilled-inquiry" : undefined}>
      {prefilledEntry && (
        <style>{`.irha-prefilled-inquiry section:first-of-type .container-luxe > p[class*="text-foreground/60"] { display: none; }`}</style>
      )}
      <InquiryBase />
    </div>
  );
}
