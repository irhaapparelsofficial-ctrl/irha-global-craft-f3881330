import type { HTMLAttributes, ReactNode } from "react";

export type CatalogMediaRatio = "landscape" | "portrait" | "square";

const MEDIA_RATIO: Record<CatalogMediaRatio, string> = {
  landscape: "aspect-[4/3]",
  portrait: "aspect-[4/5]",
  square: "aspect-square",
};

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function CatalogCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <article
      {...props}
      className={classes(
        "group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/25 transition-[border-color,box-shadow] duration-300 hover:border-primary/55 hover:shadow-elegant focus-within:border-primary/70 focus-within:ring-1 focus-within:ring-primary/35 motion-reduce:transition-none",
        className,
      )}
    />
  );
}

export function CatalogCardMedia({
  ratio = "portrait",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ratio?: CatalogMediaRatio; children: ReactNode }) {
  return (
    <div
      {...props}
      className={classes(
        "relative isolate overflow-hidden bg-[#0d1117]",
        MEDIA_RATIO[ratio],
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(213,173,77,.12),transparent_58%)]"
      />
      {children}
    </div>
  );
}

export function CatalogCardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={classes("flex min-w-0 flex-1 flex-col p-4 sm:p-5", className)}
    />
  );
}

export function CatalogCardEyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={classes(
        "line-clamp-1 text-[8px] font-semibold uppercase leading-4 tracking-[0.15em] text-foreground/45",
        className,
      )}
    />
  );
}

export function CatalogCardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      {...props}
      className={classes(
        "mt-2 line-clamp-2 min-h-[2.35em] break-words font-display text-lg leading-[1.12] text-foreground transition-colors group-hover:text-primary sm:text-xl motion-reduce:transition-none",
        className,
      )}
    />
  );
}

export function CatalogCardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={classes(
        "mt-2 line-clamp-3 text-xs leading-5 text-foreground/60 sm:leading-6",
        className,
      )}
    />
  );
}

export function CatalogCardActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={classes("mt-auto pt-4", className)}
    />
  );
}
