import { useEffect, useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { responsiveImageAttributes, thumbnailUrl } from "@/lib/imageThumbnails";
import { semanticImageAlt } from "@/lib/imageSeo";
import {
  CONTROLLED_IMAGE_FALLBACK,
  reportImageFailure,
  type ImageLoadState,
} from "@/lib/imageLoading";

type ThumbnailImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  originalSrc?: string | null;
  fallbackSrc?: string;
  responsive?: boolean;
};

const DEFAULT_RESPONSIVE_SIZES = "(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 33vw";

export default function ThumbnailImage({
  src,
  originalSrc,
  fallbackSrc,
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
}: ThumbnailImageProps) {
  const original = originalSrc || src || "";
  const requested = src || original;
  const candidate = useMemo(() => thumbnailUrl(requested) || requested, [requested]);
  const responsiveAttributes = useMemo(
    () => responsiveImageAttributes(original),
    [original],
  );
  const sources = useMemo(
    () => Array.from(new Set([candidate, original, fallbackSrc].filter((value): value is string => Boolean(value?.trim())))),
    [candidate, fallbackSrc, original],
  );
  const sourceKey = sources.join("|");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [responsiveFailed, setResponsiveFailed] = useState(false);
  const [imageState, setImageState] = useState<ImageLoadState>("idle");

  useEffect(() => {
    let cancelled = false;
    setSourceIndex(0);
    setResponsiveFailed(false);
    if (sources.length === 0) {
      setImageState("failed");
      return () => { cancelled = true; };
    }
    setImageState("requested");
    queueMicrotask(() => {
      if (!cancelled) setImageState("loading");
    });
    return () => { cancelled = true; };
  }, [sourceKey, sources.length]);

  const controlledFallbackActive = sourceIndex >= sources.length;
  const currentSrc = controlledFallbackActive
    ? CONTROLLED_IMAGE_FALLBACK
    : sources[sourceIndex];
  const useResponsiveSet = responsive
    && !responsiveFailed
    && sourceIndex === 0
    && !controlledFallbackActive
    && Boolean(responsiveAttributes.srcSet || srcSet);
  const resolvedAlt = semanticImageAlt(original, props.alt);
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
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((index) => Math.min(index + 1, sources.length - 1));
      requestNextSource();
      return;
    }
    reportImageFailure(original || currentSrc);
    setSourceIndex(sources.length);
    setImageState("failed");
    onError?.(event);
  };

  return (
    <img
      {...props}
      src={currentSrc}
      alt={resolvedAlt}
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
      data-thumbnail-source={candidate !== original ? original : undefined}
      data-responsive-image={useResponsiveSet ? "true" : undefined}
      data-responsive-fallback={responsiveFailed ? "true" : undefined}
      data-fallback-active={controlledFallbackActive ? "true" : undefined}
    />
  );
}
