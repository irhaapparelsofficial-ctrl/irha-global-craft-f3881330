import { useEffect, useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { responsiveImageAttributes } from "@/lib/imageThumbnails";
import {
  CONTROLLED_IMAGE_FALLBACK,
  reportImageFailure,
  type ImageLoadState,
} from "@/lib/imageLoading";

type ResilientImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  sources: Array<string | null | undefined>;
  responsive?: boolean;
};

const DEFAULT_RESPONSIVE_SIZES = "(max-width: 640px) 92vw, (max-width: 1024px) 50vw, 40vw";
const LEGACY_PLACEHOLDER = /(?:^|\/)placeholder\.svg(?:[?#]|$)/i;

function usableSource(value: string | null | undefined): value is string {
  return Boolean(value?.trim()) && !LEGACY_PLACEHOLDER.test(value!);
}

export default function ResilientImage({
  sources,
  onError,
  onLoad,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes,
  srcSet,
  responsive = true,
  className,
  style,
  ...props
}: ResilientImageProps) {
  const candidates = useMemo(
    () => Array.from(new Set(sources.filter(usableSource))),
    [sources],
  );
  const sourceKey = candidates.join("|");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [responsiveFailed, setResponsiveFailed] = useState(false);
  const [imageState, setImageState] = useState<ImageLoadState>("idle");

  useEffect(() => {
    let cancelled = false;
    setSourceIndex(0);
    setResponsiveFailed(false);
    if (candidates.length === 0) {
      setImageState("failed");
      return () => { cancelled = true; };
    }
    setImageState("requested");
    queueMicrotask(() => {
      if (!cancelled) setImageState("loading");
    });
    return () => { cancelled = true; };
  }, [candidates.length, sourceKey]);

  const controlledFallbackActive = sourceIndex >= candidates.length;
  const currentSource = controlledFallbackActive
    ? CONTROLLED_IMAGE_FALLBACK
    : candidates[sourceIndex];
  const responsiveAttributes = useMemo(() => {
    for (const candidate of candidates) {
      const attributes = responsiveImageAttributes(candidate);
      if (attributes.srcSet) return attributes;
    }
    return responsiveImageAttributes(currentSource);
  }, [candidates, currentSource]);
  const useResponsiveSet = responsive
    && !responsiveFailed
    && sourceIndex === 0
    && !controlledFallbackActive
    && Boolean(srcSet || responsiveAttributes.srcSet);
  const visible = imageState === "loaded" || imageState === "failed";

  const requestNextSource = () => {
    setImageState("requested");
    queueMicrotask(() => setImageState("loading"));
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (controlledFallbackActive) {
      setImageState("failed");
      onError?.(event);
      return;
    }
    if (useResponsiveSet) {
      setResponsiveFailed(true);
      requestNextSource();
      return;
    }
    if (sourceIndex + 1 < candidates.length) {
      setSourceIndex((current) => current + 1);
      requestNextSource();
      return;
    }
    reportImageFailure(currentSource);
    setSourceIndex(candidates.length);
    setImageState("failed");
    onError?.(event);
  };

  return (
    <img
      {...props}
      src={currentSource}
      srcSet={useResponsiveSet ? srcSet || responsiveAttributes.srcSet : undefined}
      sizes={useResponsiveSet ? sizes || DEFAULT_RESPONSIVE_SIZES : sizes}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority ?? (loading === "lazy" ? "low" : undefined)}
      onLoad={(event) => {
        setImageState(controlledFallbackActive ? "failed" : "loaded");
        onLoad?.(event);
      }}
      onError={handleError}
      aria-busy={imageState === "requested" || imageState === "loading" ? "true" : undefined}
      className={className}
      style={{ ...style, visibility: visible ? "visible" : "hidden" }}
      data-managed-image="true"
      data-image-state={imageState}
      data-responsive-image={useResponsiveSet ? "true" : undefined}
      data-responsive-fallback={responsiveFailed ? "true" : undefined}
      data-fallback-active={controlledFallbackActive ? "true" : undefined}
    />
  );
}
