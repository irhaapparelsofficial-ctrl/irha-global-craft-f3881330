import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomepageMediaMap = Record<string, string>;

type PublicHomepageMediaRow = {
  role: string;
  public_url: string;
  alt_text: string | null;
};

type PublicRpcClient = {
  rpc: (
    functionName: string,
    args?: Record<string, never>,
  ) => Promise<{
    data: PublicHomepageMediaRow[] | null;
    error: { message: string } | null;
  }>;
};

export function useHomepageMedia() {
  return useQuery({
    queryKey: ["public-homepage-media"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<HomepageMediaMap> => {
      const publicRpc = supabase as unknown as PublicRpcClient;
      const { data, error } = await publicRpc.rpc("get_public_homepage_media");
      if (error) throw new Error(error.message);

      return Object.fromEntries(
        (data ?? [])
          .map((item) => [item.role, item.public_url] as const)
          .filter(([, url]) => Boolean(url)),
      );
    },
  });
}
