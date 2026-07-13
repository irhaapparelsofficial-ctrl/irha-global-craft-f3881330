import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";

type ResilientImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  sources: Array<string | null | undefined>;
};

export default function ResilientImage({ sources, onError, ...props }: ResilientImageProps) {
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

  return (
    <img
      {...props}
      src={currentSource}
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
