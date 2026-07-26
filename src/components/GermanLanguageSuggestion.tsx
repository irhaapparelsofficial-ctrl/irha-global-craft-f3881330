import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import {
  browserPrefersGerman,
  dismissLanguageSuggestion,
  getExplicitLanguagePreference,
  getLanguageDestination,
  getRouteLocale,
  isLanguageSuggestionDismissed,
  setExplicitLanguagePreference,
  SHARED_UI_COPY,
} from "@/lib/i18nFoundation";

export default function GermanLanguageSuggestion() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const copy = SHARED_UI_COPY.en;

  useEffect(() => {
    if (getRouteLocale(pathname) !== "en") {
      setVisible(false);
      return;
    }
    if (getExplicitLanguagePreference() || isLanguageSuggestionDismissed()) {
      setVisible(false);
      return;
    }

    const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
    setVisible(browserPrefersGerman(languages));
  }, [pathname]);

  if (!visible) return null;

  const close = () => {
    dismissLanguageSuggestion();
    setVisible(false);
  };

  const continueEnglish = () => {
    setExplicitLanguagePreference("en");
    setVisible(false);
  };

  return (
    <aside
      role="region"
      aria-label={copy.languageSuggestionLabel}
      data-irha-language-suggestion="true"
      className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-2xl rounded-lg border border-primary/45 bg-background/98 p-4 shadow-2xl backdrop-blur md:bottom-5 md:flex md:items-center md:gap-4"
    >
      <p lang="de" className="pr-8 text-sm leading-6 text-foreground/82 md:flex-1 md:pr-0">
        {copy.languageSuggestionText}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 md:mt-0 md:shrink-0">
        <a
          href={getLanguageDestination(pathname, "de")}
          hrefLang="de"
          lang="de"
          onClick={() => setExplicitLanguagePreference("de")}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {copy.viewGerman}
        </a>
        <button
          type="button"
          onClick={continueEnglish}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border/70 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/75 outline-none hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {copy.continueEnglish}
        </button>
      </div>
      <button
        type="button"
        aria-label={copy.dismissSuggestion}
        onClick={close}
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/55 outline-none hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X size={17} />
      </button>
    </aside>
  );
}
