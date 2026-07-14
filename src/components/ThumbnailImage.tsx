import { useEffect, useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { thumbnailUrl } from "@/lib/imageThumbnails";

type ThumbnailImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  originalSrc?: string | null;
  fallbackSrc?: string;
};

export default function ThumbnailImage({
  src,
  originalSrc,
  fallbackSrc = "/placeholder.svg",
  onError,
  loading = "lazy",
  decoding = "async",
  ...props
}: ThumbnailImageProps) {
  const original = originalSrc || src || fallbackSrc;
  const requested = src || original;
  const candidate = useMemo(() => thumbnailUrl(requested) || requested, [requested]);
  const sources = useMemo(
    () => Array.from(new Set([candidate, original, fallbackSrc].filter((value): value is string => Boolean(value)))),
    [candidate, fallbackSrc, original],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => setSourceIndex(0), [sources]);

  const currentSrc = sources[Math.min(sourceIndex, Math.max(0, sources.length - 1))] || fallbackSrc;

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
      data-fallback-active={currentSrc === fallbackSrc && fallbackSrc !== original ? "true" : undefined}
    />
  );
}
