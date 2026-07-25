import { useEffect, useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { responsiveImageAttributes, thumbnailUrl } from "@/lib/imageThumbnails";
import { semanticImageAlt } from "@/lib/imageSeo";
import bavarianHero from "@/assets/og/og-bavarian-hero.jpg";
import leatherHero from "@/assets/og/og-leather.jpg";
import sportswearHero from "@/assets/og/og-sportswear.jpg";
import streetwearHero from "@/assets/og/og-streetwear.jpg";
import nightwearHero from "@/assets/og/og-nightwear.jpg";

type ThumbnailImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  originalSrc?: string | null;
  fallbackSrc?: string;
  responsive?: boolean;
};

const DEFAULT_RESPONSIVE_SIZES = "(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 33vw";

function semanticFallback(alt?: string): string | undefined {
  const value = alt?.toLowerCase() ?? "";
  if (/bavarian|lederhosen|dirndl|trachten/.test(value)) return bavarianHero;
  if (/leather/.test(value)) return leatherHero;
  if (/sportswear|activewear|uniform|teamwear/.test(value)) return sportswearHero;
  if (/streetwear|leisurewear/.test(value)) return streetwearHero;
  if (/nightwear|sleepwear/.test(value)) return nightwearHero;
  return undefined;
}

export default function ThumbnailImage({
  src,
  originalSrc,
  fallbackSrc,
  onError,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes,
  srcSet,
  responsive = true,
  ...props
}: ThumbnailImageProps) {
  const fallback = fallbackSrc || semanticFallback(props.alt) || "/placeholder.svg";
  const original = originalSrc || src || fallback;
  const requested = src || original;
  const candidate = useMemo(() => thumbnailUrl(requested) || requested, [requested]);
  const responsiveAttributes = useMemo(
    () => responsiveImageAttributes(original),
    [original],
  );
  const sources = useMemo(
    () => Array.from(new Set([candidate, original, fallback].filter((value): value is string => Boolean(value)))),
    [candidate, fallback, original],
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const [responsiveFailed, setResponsiveFailed] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setResponsiveFailed(false);
  }, [sources]);

  const currentSrc = sources[Math.min(sourceIndex, Math.max(0, sources.length - 1))] || fallback;
  const useResponsiveSet = responsive
    && !responsiveFailed
    && sourceIndex === 0
    && Boolean(responsiveAttributes.srcSet || srcSet);
  const resolvedAlt = semanticImageAlt(original, props.alt);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (useResponsiveSet) {
      setResponsiveFailed(true);
      return;
    }
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((index) => Math.min(index + 1, sources.length - 1));
      return;
    }
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
      fetchPriority={fetchPriority ?? (loading === "eager" ? "high" : "low")}
      onError={handleError}
      data-thumbnail-source={candidate !== original ? original : undefined}
      data-responsive-image={useResponsiveSet ? "true" : undefined}
      data-responsive-fallback={responsiveFailed ? "true" : undefined}
      data-fallback-active={currentSrc === fallback && fallback !== original ? "true" : undefined}
    />
  );
}
