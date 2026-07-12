import { useMemo } from "react";
import { usePublishedCmsDocument } from "@/hooks/usePublishedCmsDocument";
import {
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_HOME_LAYOUT,
  GLOBAL_SETTINGS_DOCUMENT_KEY,
  HOME_LAYOUT_DOCUMENT_KEY,
  normalizeGlobalSettings,
  normalizeHomeLayout,
} from "@/lib/siteConfiguration";

export function useGlobalSettings() {
  const state = usePublishedCmsDocument(GLOBAL_SETTINGS_DOCUMENT_KEY, DEFAULT_GLOBAL_SETTINGS);
  const data = useMemo(() => normalizeGlobalSettings(state.data), [state.data]);
  return { ...state, data };
}

export function useHomeSectionLayout() {
  const state = usePublishedCmsDocument(HOME_LAYOUT_DOCUMENT_KEY, DEFAULT_HOME_LAYOUT);
  const data = useMemo(() => normalizeHomeLayout(state.data), [state.data]);
  return { ...state, data };
}
