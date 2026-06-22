import { Helmet } from "react-helmet-async";
import StudioPricingPanel from "@/components/admin/StudioPricingPanel";

export default function Studio() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Mockup Studio & FOB Estimator | IRHA Apparels</title>
        <meta
          name="description"
          content="Design your production run in 3D and get an instant FOB quote in USD, EUR or GBP. Material, quantity and trim selectors with live volume-tier pricing — direct from our Sialkot factory."
        />
        <link rel="canonical" href="https://www.irhaapparels.com/studio" />
        <meta property="og:title" content="AI Mockup Studio & FOB Estimator | IRHA Apparels" />
        <meta
          property="og:description"
          content="Configure material, quantity and trims to get a live FOB estimate from IRHA Apparels."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.irhaapparels.com/studio" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <section className="border-b border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
            Interactive Studio · Sialkot Factory Direct
          </p>
          <h1 className="font-serif text-3xl md:text-5xl leading-tight max-w-3xl">
            AI Mockup Studio & FOB Estimator
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Pick a material, dial in quantity, toggle trims — get a live FOB price across USD, EUR
            and GBP with volume-tier discounts already applied.
          </p>
        </div>
      </section>

      <section id="studio-engine" className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <StudioPricingPanel />
      </section>
    </div>
  );
}
