import { lazy, Suspense } from "react";
import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
import CapabilityStrip from "@/components/sections/CapabilityStrip";
import ViewportDeferred from "@/components/performance/ViewportDeferred";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
} from "@/lib/seoSchema";

const HOME_TITLE = "Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan";
const HOME_DESCRIPTION = "Irha Apparels is a B2B apparel manufacturer in Sialkot, Pakistan, supplying custom Lederhosen, Dirndl, leather apparel, sportswear, streetwear and private-label clothing programs.";

const HomeCategoryUniverse = lazy(() => import("@/components/sections/HomeCategoryUniverse"));
const HomeManufacturingEditorial = lazy(() => import("@/components/sections/HomeManufacturingEditorial"));
const FactoryInfrastructure = lazy(() => import("@/components/sections/FactoryInfrastructure"));
const ProcessTimeline = lazy(() => import("@/components/sections/ProcessTimeline"));
const BuyerDecisionSection = lazy(() => import("@/components/sections/BuyerDecisionSection"));
const StartProgramCTA = lazy(() => import("@/components/sections/StartProgramCTA"));

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    url: `${SITE_URL}/`,
    name: HOME_TITLE,
    description: HOME_DESCRIPTION,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
    inLanguage: "en",
  };

  return (
    <>
      <SEO
        title={HOME_TITLE}
        description={HOME_DESCRIPTION}
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
      <ViewportDeferred minHeight={620} rootMargin="120px 0px">
        <Suspense fallback={<div aria-hidden className="min-h-[280px]" />}>
          <div className="[content-visibility:auto] [contain-intrinsic-size:620px]">
            <HomeManufacturingEditorial />
          </div>
        </Suspense>
      </ViewportDeferred>
      <ViewportDeferred minHeight={880} rootMargin="220px 0px">
        <Suspense fallback={<div aria-hidden className="min-h-[420px]" />}>
          <div className="[content-visibility:auto] [contain-intrinsic-size:880px]">
            <FactoryInfrastructure />
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
