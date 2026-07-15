import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_GLOBAL_SITE_SETTINGS,
  GLOBAL_SITE_SETTINGS_KEY,
  normalizeGlobalSiteSettings,
  type GlobalSiteSettings,
} from "@/lib/siteSettings";

async function fetchSiteSettings(): Promise<GlobalSiteSettings> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const db = supabase as any;
    const { data, error } = await db.rpc("cms_get_published_document", {
      _key: GLOBAL_SITE_SETTINGS_KEY,
    });
    if (error || !data) return DEFAULT_GLOBAL_SITE_SETTINGS;
    return normalizeGlobalSiteSettings(data);
  } catch {
    return DEFAULT_GLOBAL_SITE_SETTINGS;
  }
}

type UseSiteSettingsOptions = {
  deferMs?: number;
};

export function useSiteSettings({ deferMs = 0 }: UseSiteSettingsOptions = {}) {
  const [enabled, setEnabled] = useState(deferMs <= 0);

  useEffect(() => {
    if (deferMs <= 0) {
      setEnabled(true);
      return;
    }
    const timer = window.setTimeout(() => setEnabled(true), deferMs);
    return () => window.clearTimeout(timer);
  }, [deferMs]);

  const query = useQuery({
    queryKey: ["cms", GLOBAL_SITE_SETTINGS_KEY, "published"],
    queryFn: fetchSiteSettings,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: DEFAULT_GLOBAL_SITE_SETTINGS,
    retry: false,
  });
  return { ...query, data: query.data ?? DEFAULT_GLOBAL_SITE_SETTINGS };
}
