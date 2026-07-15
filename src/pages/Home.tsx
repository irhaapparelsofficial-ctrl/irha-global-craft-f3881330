import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
import CapabilityStrip from "@/components/sections/CapabilityStrip";
import HomeCategoryUniverse from "@/components/sections/HomeCategoryUniverse";
import ProcessTimeline from "@/components/sections/ProcessTimeline";
import HomeManufacturingEditorial from "@/components/sections/HomeManufacturingEditorial";
import BuyerDecisionSection from "@/components/sections/BuyerDecisionSection";
import StartProgramCTA from "@/components/sections/StartProgramCTA";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  organizationSchema,
  websiteSchema,
} from "@/lib/seoSchema";

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
      <HomeCategoryUniverse />
      <HomeManufacturingEditorial />
      <ProcessTimeline />
      <BuyerDecisionSection />
      <StartProgramCTA />
    </>
  );
}
