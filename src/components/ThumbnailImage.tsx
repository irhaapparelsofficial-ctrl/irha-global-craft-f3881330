import { useEffect, useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { thumbnailUrl } from "@/lib/imageThumbnails";
import bavarianHero from "@/assets/og/og-bavarian-hero.jpg";
import leatherHero from "@/assets/og/og-leather.jpg";
import sportswearHero from "@/assets/og/og-sportswear.jpg";
import streetwearHero from "@/assets/og/og-streetwear.jpg";
import nightwearHero from "@/assets/og/og-nightwear.jpg";

type ThumbnailImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  originalSrc?: string | null;
  fallbackSrc?: string;
};

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
  ...props
}: ThumbnailImageProps) {
  const fallback = fallbackSrc || semanticFallback(props.alt) || "/placeholder.svg";
  const original = originalSrc || src || fallback;
  const requested = src || original;
  const candidate = useMemo(() => thumbnailUrl(requested) || requested, [requested]);
  const sources = useMemo(
    () => Array.from(new Set([candidate, original, fallback].filter((value): value is string => Boolean(value)))),
    [candidate, fallback, original],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => setSourceIndex(0), [sources]);

  const currentSrc = sources[Math.min(sourceIndex, Math.max(0, sources.length - 1))] || fallback;

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
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
      loading={loading}
      decoding={decoding}
      onError={handleError}
      data-thumbnail-source={candidate !== original ? original : undefined}
      data-fallback-active={currentSrc === fallback && fallback !== original ? "true" : undefined}
    />
  );
}
