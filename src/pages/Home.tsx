import { lazy, Suspense } from "react";
import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
import CapabilityStrip from "@/components/sections/CapabilityStrip";
import ViewportDeferred from "@/components/performance/ViewportDeferred";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  organizationSchema,
  websiteSchema,
} from "@/lib/seoSchema";

const HomeCategoryUniverse = lazy(() => import("@/components/sections/HomeCategoryUniverse"));
const HomeManufacturingEditorial = lazy(() => import("@/components/sections/HomeManufacturingEditorial"));
const ProcessTimeline = lazy(() => import("@/components/sections/ProcessTimeline"));
const BuyerDecisionSection = lazy(() => import("@/components/sections/BuyerDecisionSection"));
const StartProgramCTA = lazy(() => import("@/components/sections/StartProgramCTA"));

export default function Home() {
  const jsonLd = [
    organizationSchema,
    websiteSchema,
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: "Irha Apparels — B2B Custom Apparel Manufacturer",
      description:
        "Made-to-order OEM, ODM and private-label apparel manufacturing in Sialkot, Pakistan for brands, wholesalers and importers.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
  ];

  return (
    <>
      <SEO
        title="Irha Apparels — B2B Custom Apparel Manufacturer"
        description="Made-to-order OEM, ODM and private-label apparel manufacturing in Sialkot, Pakistan. Bavarian wear, sportswear, leatherwear, streetwear and leisure apparel for brands, wholesalers and importers."
        path="/"
        jsonLd={jsonLd}
      />
      <HeroCarousel />
      <CapabilityStrip />

      <ViewportDeferred minHeight={760} rootMargin="180px 0px">
        <Suspense fallback={<div aria-hidden className="min-h-[360px]" />}>
          <div className="[content-visibility:auto] [contain-intrinsic-size:760px]">
            <HomeCategoryUniverse />
          </div>
        </Suspense>
      </ViewportDeferred>
      <ViewportDeferred minHeight={620} rootMargin="220px 0px">
        <Suspense fallback={<div aria-hidden className="min-h-[280px]" />}>
          <div className="[content-visibility:auto] [contain-intrinsic-size:620px]">
            <HomeManufacturingEditorial />
          </div>
        </Suspense>
      </ViewportDeferred>
      <ViewportDeferred minHeight={520} rootMargin="220px 0px">
        <Suspense fallback={<div aria-hidden className="min-h-[240px]" />}>
          <div className="[content-visibility:auto] [contain-intrinsic-size:520px]">
            <ProcessTimeline />
          </div>
        </Suspense>
      </ViewportDeferred>
      <ViewportDeferred minHeight={560} rootMargin="220px 0px">
        <Suspense fallback={<div aria-hidden className="min-h-[260px]" />}>
          <div className="[content-visibility:auto] [contain-intrinsic-size:560px]">
            <BuyerDecisionSection />
          </div>
        </Suspense>
      </ViewportDeferred>
      <ViewportDeferred minHeight={360} rootMargin="220px 0px">
        <Suspense fallback={<div aria-hidden className="min-h-[180px]" />}>
          <div className="[content-visibility:auto] [contain-intrinsic-size:360px]">
            <StartProgramCTA />
          </div>
        </Suspense>
      </ViewportDeferred>
    </>
  );
}
