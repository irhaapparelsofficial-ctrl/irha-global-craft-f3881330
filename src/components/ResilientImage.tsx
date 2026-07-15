import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import { responsiveImageAttributes } from "@/lib/imageThumbnails";

type ResilientImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  sources: Array<string | null | undefined>;
  responsive?: boolean;
};

const DEFAULT_RESPONSIVE_SIZES = "(max-width: 640px) 92vw, (max-width: 1024px) 50vw, 40vw";

export default function ResilientImage({
  sources,
  onError,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes,
  srcSet,
  responsive = true,
  ...props
}: ResilientImageProps) {
  const candidates = useMemo(
    () => Array.from(new Set(sources.filter((source): source is string => Boolean(source?.trim())))),
    [sources],
  );
  const sourceKey = candidates.join("|");
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sourceKey]);

  const currentSource = candidates[sourceIndex] ?? "/placeholder.svg";
  const responsiveAttributes = useMemo(() => {
    for (const candidate of candidates) {
      const attributes = responsiveImageAttributes(candidate);
      if (attributes.srcSet) return attributes;
    }
    return responsiveImageAttributes(currentSource);
  }, [candidates, currentSource]);
  const useResponsiveSet = responsive && sourceIndex === 0 && Boolean(srcSet || responsiveAttributes.srcSet);

  return (
    <img
      {...props}
      src={currentSource}
      srcSet={useResponsiveSet ? srcSet || responsiveAttributes.srcSet : undefined}
      sizes={useResponsiveSet ? sizes || DEFAULT_RESPONSIVE_SIZES : sizes}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority ?? (loading === "eager" ? "high" : "low")}
      data-responsive-image={useResponsiveSet ? "true" : undefined}
      onError={(event) => {
        if (sourceIndex + 1 < candidates.length) {
          setSourceIndex((current) => current + 1);
          return;
        }
        onError?.(event);
      }}
    />
  );
}
