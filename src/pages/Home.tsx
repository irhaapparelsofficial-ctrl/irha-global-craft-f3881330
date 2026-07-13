import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
import CapabilityStrip from "@/components/sections/CapabilityStrip";
import HomeCategoryUniverse from "@/components/sections/HomeCategoryUniverse";
import BuyerTrustSection from "@/components/sections/BuyerTrustSection";
import HomeProductShowcase from "@/components/sections/HomeProductShowcase";
import ProcessTimeline from "@/components/sections/ProcessTimeline";
import HomeManufacturingEditorial from "@/components/sections/HomeManufacturingEditorial";
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
      name: "Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers",
      description:
        "OEM, ODM and private-label apparel manufacturing in Sialkot, Pakistan for brands, wholesalers and importers worldwide.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
  ];

  return (
    <>
      <SEO
        title="Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers"
        description="OEM, ODM and private-label apparel manufacturer in Sialkot, Pakistan. Custom cut & sew, embroidery, printing, private label and export support for brands and importers worldwide."
        path="/"
        jsonLd={jsonLd}
      />

      <HeroCarousel />
      <CapabilityStrip />
      <HomeCategoryUniverse />
      <BuyerTrustSection />
      <HomeProductShowcase />
      <ProcessTimeline />
      <HomeManufacturingEditorial />
      <StartProgramCTA />
    </>
  );
}
