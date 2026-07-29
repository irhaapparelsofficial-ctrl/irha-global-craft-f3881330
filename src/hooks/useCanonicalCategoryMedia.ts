import { useMemo } from "react";
import { useHomepageMedia } from "@/hooks/useHomepageMedia";
import {
  resolveCanonicalCategoryMediaMap,
  type CategoryMediaRole,
  type HomepageMediaMap,
} from "@/lib/categoryMediaRegistry";

export function useCanonicalCategoryMedia() {
  const query = useHomepageMedia();
  const approvedMedia = (query.data ?? {}) as Partial<Record<CategoryMediaRole, string>>;
  const mediaBySlug = useMemo(
    () => resolveCanonicalCategoryMediaMap(approvedMedia as HomepageMediaMap),
    [approvedMedia],
  );

  return {
    ...query,
    approvedMedia,
    mediaBySlug,
  };
}
