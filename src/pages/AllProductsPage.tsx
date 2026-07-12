import SEO from "@/components/SEO";
import Products from "./Products";

const SITE = "https://www.irhaapparels.com";

export default function AllProductsPage() {
  return (
    <>
      <Products />
      <SEO
        title="Search All Custom Apparel Products | Irha Apparels"
        description="Search the complete Irha Apparels B2B product catalogue across Bavarian Trachten, leather apparel, sportswear, streetwear, activewear, leisurewear and nightwear."
        path="/products/all"
        noindex
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Search All Irha Apparels Products",
          url: `${SITE}/products/all`,
          description:
            "Utility catalogue search covering all custom apparel manufacturing categories available from Irha Apparels.",
          isPartOf: {
            "@type": "WebSite",
            name: "Irha Apparels",
            url: `${SITE}/`,
          },
        }}
      />
    </>
  );
}
