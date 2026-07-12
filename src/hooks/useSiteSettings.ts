import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_GLOBAL_SITE_SETTINGS,
  GLOBAL_SITE_SETTINGS_KEY,
  normalizeGlobalSiteSettings,
  type GlobalSiteSettings,
} from "@/lib/siteSettings";

const db = supabase as any;

async function fetchSiteSettings(): Promise<GlobalSiteSettings> {
  try {
    const { data, error } = await db.rpc("cms_get_published_document", {
      _key: GLOBAL_SITE_SETTINGS_KEY,
    });
    if (error || !data) return DEFAULT_GLOBAL_SITE_SETTINGS;
    return normalizeGlobalSiteSettings(data);
  } catch {
    return DEFAULT_GLOBAL_SITE_SETTINGS;
  }
}

export function useSiteSettings() {
  const query = useQuery({
    queryKey: ["cms", GLOBAL_SITE_SETTINGS_KEY, "published"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: DEFAULT_GLOBAL_SITE_SETTINGS,
    retry: false,
  });
  return { ...query, data: query.data ?? DEFAULT_GLOBAL_SITE_SETTINGS };
}
