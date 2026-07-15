import { useEffect, useRef, useState, type ReactNode } from "react";

type ViewportDeferredProps = {
  children: ReactNode;
  minHeight: number;
  rootMargin?: string;
  fallbackDelayMs?: number;
};

export default function ViewportDeferred({
  children,
  minHeight,
  rootMargin = "200px 0px",
  fallbackDelayMs = 15_000,
}: ViewportDeferredProps) {
  const [ready, setReady] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ready) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(sentinel);

    const fallback = window.setTimeout(() => setReady(true), fallbackDelayMs);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [fallbackDelayMs, ready, rootMargin]);

  return (
    <div
      ref={sentinelRef}
      style={ready ? undefined : { minHeight }}
      aria-busy={!ready || undefined}
    >
      {ready ? children : null}
    </div>
  );
}
