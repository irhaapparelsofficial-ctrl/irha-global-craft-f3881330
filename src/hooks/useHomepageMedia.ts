import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomepageMediaMap = Record<string, string>;

export function useHomepageMedia() {
  return useQuery({
    queryKey: ["public-homepage-media"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<HomepageMediaMap> => {
      const { data: placements, error: placementError } = await supabase
        .from("site_media_placements")
        .select("role,media_asset_id")
        .eq("page_type", "home")
        .in("page_slug", ["/", "home"])
        .eq("active", true)
        .order("sort_order");

      if (placementError) throw placementError;
      const assetIds = [...new Set((placements ?? []).map((item) => item.media_asset_id).filter(Boolean))];
      if (!assetIds.length) return {};

      const { data: assets, error: assetError } = await supabase
        .from("media_assets")
        .select("id,public_url,ai_master_url,thumbnail_url,status,verification_status")
        .in("id", assetIds)
        .eq("status", "active")
        .eq("verification_status", "verified");

      if (assetError) throw assetError;
      const assetMap = new Map(
        (assets ?? []).map((asset) => [asset.id, asset.ai_master_url || asset.public_url || asset.thumbnail_url || ""]),
      );

      return Object.fromEntries(
        (placements ?? [])
          .map((placement) => [placement.role, assetMap.get(placement.media_asset_id) || ""] as const)
          .filter(([, url]) => Boolean(url)),
      );
    },
  });
}
