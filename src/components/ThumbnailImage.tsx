import { useEffect, useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { thumbnailUrl } from "@/lib/imageThumbnails";

type ThumbnailImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

export default function ThumbnailImage({
  src,
  fallbackSrc = "/placeholder.svg",
  onError,
  loading = "lazy",
  decoding = "async",
  ...props
}: ThumbnailImageProps) {
  const original = src || fallbackSrc;
  const candidate = useMemo(() => thumbnailUrl(original) || original, [original]);
  const [useOriginal, setUseOriginal] = useState(false);

  useEffect(() => setUseOriginal(false), [candidate, original]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (!useOriginal && candidate !== original) {
      setUseOriginal(true);
      return;
    }
    onError?.(event);
  };

  return (
    <img
      {...props}
      src={useOriginal ? original : candidate}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      data-thumbnail-source={candidate !== original ? original : undefined}
    />
  );
}
