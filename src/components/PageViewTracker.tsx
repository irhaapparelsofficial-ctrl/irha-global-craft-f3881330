import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function PageViewTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    const pageLocation = window.location.href;
    const pagePath = pathname + search;

    window.gtag("event", "page_view", {
      page_location: pageLocation,
      page_path: pagePath,
      send_to: "G-RV39YH4CPF",
    });
  }, [pathname, search]);

  return null;
}
