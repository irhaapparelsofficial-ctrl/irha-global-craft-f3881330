import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PublishedCmsState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  source: "fallback" | "cms";
};

export function usePublishedCmsDocument<T>(documentKey: string, fallback: T): PublishedCmsState<T> {
  const [state, setState] = useState<PublishedCmsState<T>>({
    data: fallback,
    loading: true,
    error: null,
    source: "fallback",
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const db = supabase as any;
      const { data, error } = await db.rpc("cms_get_published_document", { _key: documentKey });
      if (cancelled) return;

      if (error || !data || typeof data !== "object") {
        setState({
          data: fallback,
          loading: false,
          error: error?.message || null,
          source: "fallback",
        });
        return;
      }

      setState({ data: data as T, loading: false, error: null, source: "cms" });
    };

    void load();
    return () => { cancelled = true; };
  }, [documentKey, fallback]);

  return state;
}
