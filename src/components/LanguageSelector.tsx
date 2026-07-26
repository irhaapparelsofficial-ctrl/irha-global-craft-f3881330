import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  getLanguageDestination,
  getRouteLocale,
  setExplicitLanguagePreference,
  SHARED_UI_COPY,
  type LocaleCode,
} from "@/lib/i18nFoundation";

type Props = {
  className?: string;
  mobile?: boolean;
};

export default function LanguageSelector({ className, mobile = false }: Props) {
  const { pathname } = useLocation();
  const activeLocale = getRouteLocale(pathname);
  const copy = SHARED_UI_COPY[activeLocale];

  const languages: Array<{ locale: LocaleCode; label: string }> = [
    { locale: "en", label: "English" },
    { locale: "de", label: "Deutsch" },
  ];

  return (
    <nav
      aria-label={copy.languageSelectorLabel}
      data-irha-language-selector="runtime"
      className={cn(
        "flex items-center rounded-md border border-border/70 bg-background/80 p-1",
        mobile ? "w-full justify-center" : "shrink-0",
        className,
      )}
    >
      {languages.map(({ locale, label }) => {
        const active = locale === activeLocale;
        return (
          <a
            key={locale}
            href={getLanguageDestination(pathname, locale)}
            hrefLang={locale}
            lang={locale}
            aria-current={active ? "page" : undefined}
            onClick={() => setExplicitLanguagePreference(locale)}
            className={cn(
              "inline-flex min-h-9 items-center justify-center rounded px-3 text-[9px] font-semibold uppercase tracking-[0.16em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "bg-primary text-primary-foreground" : "text-foreground/65 hover:text-primary",
              mobile && "flex-1",
            )}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
