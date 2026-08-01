import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ThumbnailImage from "@/components/ThumbnailImage";
import {
  CatalogCard,
  CatalogCardActions,
  CatalogCardBody,
  CatalogCardDescription,
  CatalogCardEyebrow,
  CatalogCardMedia,
  CatalogCardTitle,
} from "@/components/catalog/CatalogCard";

const PRODUCT_SIZES = "(max-width: 519px) 92vw, (max-width: 767px) 46vw, (max-width: 1279px) 31vw, 23vw";
const COLLECTION_SIZES = "(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw";

type ProductCatalogCardProps = {
  href: string;
  name: string;
  image?: string | null;
  originalImage?: string | null;
  eyebrow?: string;
  note?: string;
  badge?: string;
  actions?: ReactNode;
};

export function ProductCatalogCard({
  href,
  name,
  image,
  originalImage,
  eyebrow,
  note,
  badge,
  actions,
}: ProductCatalogCardProps) {
  return (
    <CatalogCard>
      <Link
        to={href}
        className="block rounded-t-xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <CatalogCardMedia ratio="portrait">
          <ThumbnailImage
            src={image}
            originalSrc={originalImage}
            alt={`${name} product style`}
            loading="lazy"
            decoding="async"
            width={960}
            height={1200}
            sizes={PRODUCT_SIZES}
            className="relative h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
          />
          {badge && (
            <span className="absolute left-3 top-3 rounded-full border border-primary/35 bg-black/75 px-2.5 py-1 text-[7px] font-semibold uppercase tracking-[0.15em] text-primary backdrop-blur">
              {badge}
            </span>
          )}
        </CatalogCardMedia>
      </Link>
      <CatalogCardBody>
        <CatalogCardEyebrow>{eyebrow}</CatalogCardEyebrow>
        <Link to={href} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <CatalogCardTitle>{name}</CatalogCardTitle>
        </Link>
        {note && (
          <CatalogCardDescription className="line-clamp-2 text-[9px] leading-4 text-foreground/48">
            {note}
          </CatalogCardDescription>
        )}
        {actions && <CatalogCardActions>{actions}</CatalogCardActions>}
      </CatalogCardBody>
    </CatalogCard>
  );
}

type CollectionCatalogCardProps = {
  href: string;
  name: string;
  description?: string;
  image?: string | null;
  originalImage?: string | null;
  count?: number;
  actionLabel: string;
};

export function CollectionCatalogCard({
  href,
  name,
  description,
  image,
  originalImage,
  count,
  actionLabel,
}: CollectionCatalogCardProps) {
  return (
    <Link
      to={href}
      className="min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <CatalogCard>
        <CatalogCardMedia ratio="landscape">
          <ThumbnailImage
            src={image}
            originalSrc={originalImage}
            alt={`${name} collection`}
            loading="lazy"
            decoding="async"
            width={960}
            height={720}
            sizes={COLLECTION_SIZES}
            className="relative h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
          />
        </CatalogCardMedia>
        <CatalogCardBody>
          <CatalogCardEyebrow>{typeof count === "number" ? `${count} styles` : "Product category"}</CatalogCardEyebrow>
          <CatalogCardTitle>{name}</CatalogCardTitle>
          {description && <CatalogCardDescription>{description}</CatalogCardDescription>}
          <CatalogCardActions className="flex min-h-11 items-end justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span>{actionLabel}</span>
            <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
          </CatalogCardActions>
        </CatalogCardBody>
      </CatalogCard>
    </Link>
  );
}
