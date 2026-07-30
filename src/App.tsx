import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import CookieConsent from "@/components/CookieConsent";
import PageViewTracker from "@/components/PageViewTracker";
import GlobalInteractionTracker from "@/components/GlobalInteractionTracker";
import SiteVisitorTracker from "@/components/SiteVisitorTracker";
import PlannedCatalogGate from "@/components/catalog/PlannedCatalogGate";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const AllProductsPage = lazy(() => import("./pages/AllProductsPage"));
const GlobalCollectionsPage = lazy(() => import("./pages/GlobalCollectionsPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CategoryTaxonomyPage = lazy(() => import("./pages/CategoryTaxonomyPage"));
const CategoryOrProductPage = lazy(() => import("./pages/CategoryOrProductPage"));
const CanonicalProductRoute = lazy(() => import("./pages/CanonicalProductRoute"));
const LegacyCatalogueRedirect = lazy(() => import("./pages/LegacyCatalogueRedirect"));
const BavarianMensCollection = lazy(() => import("./pages/BavarianMensCollection"));
const BavarianWomensCollection = lazy(() => import("./pages/BavarianWomensCollection"));
const Markets = lazy(() => import("./pages/Markets"));
const MarketLandingPage = lazy(() => import("./pages/MarketLandingPage"));
const Manufacturing = lazy(() => import("./pages/Manufacturing"));
const Inquiry = lazy(() => import("./pages/Inquiry"));
const InquiryCart = lazy(() => import("./pages/InquiryCart"));
const GermanGateway = lazy(() => import("./pages/GermanGateway"));
const GermanBavarianWear = lazy(() => import("./pages/GermanBavarianWear"));
const RepeatOrder = lazy(() => import("./pages/RepeatOrder"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LocalizedSeoPage = lazy(() => import("./pages/LocalizedSeoPage"));
const BuyerIntentLandingPage = lazy(() => import("./pages/BuyerIntentLandingPage"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLiveChat = lazy(() => import("./pages/AdminLiveChat"));
const AdminVisitors = lazy(() => import("./pages/AdminVisitors"));
const AdminOutreachQuick = lazy(() => import("./pages/AdminOutreachQuick"));
const AdminWhatsAppQuick = lazy(() => import("./pages/AdminWhatsAppQuick"));
const AdminLeadIntake = lazy(() => import("./pages/AdminLeadIntake"));
const AdminLeadReview = lazy(() => import("./pages/AdminLeadReview"));
const AdminOutreachApproval = lazy(() => import("./pages/AdminOutreachApproval"));
const AdminTaxonomyReview = lazy(() => import("./pages/AdminTaxonomyReview"));
const AdminCatalogueCompletion = lazy(() => import("./pages/AdminCatalogueCompletion"));
const AdminSlotEditor = lazy(() => import("./pages/AdminSlotEditor"));
const AdminMediaBriefQueue = lazy(() => import("./pages/AdminMediaBriefQueue"));
const AdminMediaApproval = lazy(() => import("./pages/AdminMediaApproval"));
const SeoIndexing = lazy(() => import("./pages/SeoIndexing"));
const ProductSpecSheet = lazy(() => import("./pages/ProductSpecSheet"));
const Studio = lazy(() => import("./pages/Studio"));
const Compliance = lazy(() => import("./pages/Compliance"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Connect = lazy(() => import("./pages/Connect"));
const Compare = lazy(() => import("./pages/Compare"));
const FAQ = lazy(() => import("./pages/FAQ"));
const BuyerTrust = lazy(() => import("./pages/BuyerTrust"));
const BuyerResources = lazy(() => import("./pages/BuyerResources"));
const FactoryVideoCall = lazy(() => import("./pages/FactoryVideoCall"));
const BuyerConfidence = lazy(() => import("./pages/BuyerConfidence"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AdminRuntime = lazy(() => import("@/components/admin/AdminRuntime"));

const queryClient = new QueryClient();

const LEGACY_REDIRECTS = [
  ["/catalogs/master-catalogue-2026.pdf", "/products"],
  ["/privacy", "/privacy-policy"], ["/privacy/", "/privacy-policy"],
  ["/terms", "/terms-of-service"], ["/terms/", "/terms-of-service"], ["/terms-and-conditions", "/terms-of-service"],
  ["/buyer-trust-center", "/buyer-trust"], ["/buyer-trust-centre", "/buyer-trust"], ["/buyer-resources", "/resources"], ["/buyer-faq", "/faq"],
  ["/germany", "/markets/germany"], ["/austria", "/markets/austria"], ["/switzerland", "/markets/switzerland"], ["/netherlands", "/markets/netherlands"],
  ["/usa", "/markets/united-states"], ["/united-states", "/markets/united-states"], ["/uk", "/markets/united-kingdom"], ["/united-kingdom", "/markets/united-kingdom"],
  ["/canada", "/markets/canada"], ["/australia", "/markets/australia"], ["/new-zealand", "/markets/new-zealand"],
  ["/sportswear-manufacturer-pakistan", "/products/sportswear"], ["/sportswear-manufacturer-sialkot", "/products/sportswear"], ["/private-label-sportswear-manufacturer", "/products/sportswear"],
  ["/leatherwear-manufacturer-pakistan", "/products/premium-leather-apparel"], ["/leather-jacket-manufacturer", "/products/premium-leather-apparel"],
  ["/lederhosen-manufacturer", "/products/bavarian-trachten-wear"], ["/trachten-manufacturer", "/products/bavarian-trachten-wear"], ["/oktoberfest-clothing-manufacturer", "/products/bavarian-trachten-wear"],
  ["/austria-lederhosen-manufacturer", "/lederhosen-manufacturer-germany"], ["/streetwear-manufacturer-pakistan", "/products/streetwear-activewear"], ["/uae-sportswear-manufacturer", "/products/sportswear"],
  ["/custom-apparel-manufacturer-pakistan", "/products"], ["/usa-manufacturer", "/usa-private-label-clothing-manufacturer"], ["/uk-manufacturer", "/uk-custom-apparel-manufacturer"],
  ["/germany-manufacturer", "/germany-apparel-manufacturer"], ["/canada-manufacturer", "/canada-apparel-manufacturer"], ["/australia-manufacturer", "/australia-apparel-manufacturer"],
] as const;

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      let frame = 0;
      let attempts = 0;
      const tryScroll = () => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
          return;
        }
        if (attempts++ < 20) frame = window.requestAnimationFrame(tryScroll);
      };
      frame = window.requestAnimationFrame(tryScroll);
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

function AdminRuntimeGate() {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/admin")) return null;
  return <Suspense fallback={null}><AdminRuntime /></Suspense>;
}

const PageFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite" aria-busy="true">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
    <span className="sr-only">Loading page…</span>
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <ScrollToTop />
          <PageViewTracker />
          <SiteVisitorTracker />
          <GlobalInteractionTracker />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/de" element={<Layout><GermanGateway /></Layout>} />
              <Route path="/de/" element={<Layout><GermanGateway /></Layout>} />
              <Route path="/fr" element={<Layout><BuyerIntentLandingPage /></Layout>} />
              <Route path="/fr/" element={<Layout><BuyerIntentLandingPage /></Layout>} />
              <Route path="/nl" element={<Layout><BuyerIntentLandingPage /></Layout>} />
              <Route path="/nl/" element={<Layout><BuyerIntentLandingPage /></Layout>} />
              <Route path="/legacy-home" element={<Navigate to="/" replace />} />

              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/live-chat" element={<AdminLiveChat />} />
              <Route path="/admin/visitors" element={<AdminVisitors />} />
              <Route path="/admin/outreach-quick" element={<AdminOutreachQuick />} />
              <Route path="/admin/whatsapp-quick" element={<AdminWhatsAppQuick />} />
              <Route path="/admin/lead-intake" element={<AdminLeadIntake />} />
              <Route path="/admin/lead-review" element={<AdminLeadReview />} />
              <Route path="/admin/outreach-approval" element={<AdminOutreachApproval />} />
              <Route path="/admin/taxonomy-review" element={<AdminTaxonomyReview />} />
              <Route path="/admin/catalogue-completion" element={<AdminCatalogueCompletion />} />
              <Route path="/admin/catalogue-completion/:referenceCode" element={<AdminSlotEditor />} />
              <Route path="/admin/media-briefs" element={<AdminMediaBriefQueue />} />
              <Route path="/admin/media-approval" element={<AdminMediaApproval />} />
              <Route path="/seo-indexing" element={<SeoIndexing />} />

              <Route path="*" element={<Layout><PlannedCatalogGate><Routes>
                <Route path="/about" element={<About />} />
                <Route path="/products" element={<GlobalCollectionsPage />} />
                <Route path="/products/all" element={<AllProductsPage />} />
                <Route path="/products/:categorySlug/all-products" element={<CategoryPage />} />
                <Route path="/products/:categorySlug" element={<CategoryTaxonomyPage />} />
                <Route path="/products/bavarian-trachten-wear/mens-trachten" element={<Navigate to="/products/bavarian-trachten-wear/men" replace />} />
                <Route path="/products/bavarian-trachten-wear/mens-trachten/:collectionSlug" element={<BavarianMensCollection />} />
                <Route path="/products/bavarian-trachten-wear/womens-trachten" element={<Navigate to="/products/bavarian-trachten-wear/women" replace />} />
                <Route path="/products/bavarian-trachten-wear/womens-trachten/:collectionSlug" element={<BavarianWomensCollection />} />
                <Route path="/products/:categorySlug/:audienceSlug/:collectionSlug/:productSlug" element={<CanonicalProductRoute />} />
                <Route path="/products/:categorySlug/:audienceSlug/:collectionSlug" element={<CategoryTaxonomyPage />} />
                <Route path="/products/:categorySlug/:productSlug/spec-sheet" element={<ProductSpecSheet />} />
                <Route path="/products/:categorySlug/:productSlug" element={<CategoryOrProductPage />} />
                <Route path="/intl/:locale/products/:categorySlug/:audienceSlug/:collectionSlug" element={<CategoryTaxonomyPage />} />
                <Route path="/intl/:locale/products/:categorySlug/:audienceSlug" element={<CategoryTaxonomyPage />} />
                <Route path="/intl/:locale/products/:categorySlug" element={<CategoryTaxonomyPage />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/markets/:countrySlug" element={<MarketLandingPage />} />
                <Route path="/manufacturing" element={<Manufacturing />} />
                <Route path="/materials" element={<BuyerConfidence />} />
                <Route path="/buyer-information" element={<BuyerConfidence />} />
                <Route path="/de/materialien" element={<BuyerConfidence />} />
                <Route path="/de/einkaeufer-informationen" element={<BuyerConfidence />} />
                <Route path="/fr/matieres" element={<BuyerConfidence />} />
                <Route path="/fr/informations-acheteurs" element={<BuyerConfidence />} />
                <Route path="/nl/materialen" element={<BuyerConfidence />} />
                <Route path="/nl/kopersinformatie" element={<BuyerConfidence />} />
                <Route path="/shipping-incoterms" element={<Navigate to="/buyer-information#logistics" replace />} />
                <Route path="/confidentiality" element={<Navigate to="/buyer-information#confidentiality" replace />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/buyer-trust" element={<BuyerTrust />} />
                <Route path="/factory-video-call" element={<FactoryVideoCall />} />
                <Route path="/resources" element={<BuyerResources />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/sustainability" element={<Navigate to="/buyer-information#sustainability" replace />} />
                <Route path="/shipping-returns" element={<Navigate to="/buyer-information#logistics" replace />} />
                <Route path="/inquiry" element={<Inquiry />} />
                <Route path="/inquiry-cart" element={<InquiryCart />} />
                <Route path="/shortlist" element={<Navigate to="/inquiry-cart" replace />} />
                <Route path="/repeat-order" element={<RepeatOrder />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/connect" element={<Connect />} />
                <Route path="/catalogue" element={<Navigate to="/products" replace />} />
                <Route path="/catalogue/:slug" element={<LegacyCatalogueRedirect />} />
                <Route path="/de/bavarian-wear" element={<GermanBavarianWear />} />
                <Route path="/de/katalog" element={<Navigate to="/products" replace />} />
                <Route path="/de/katalog/:slug" element={<Navigate to="/products" replace />} />
                <Route path="/catalog" element={<Navigate to="/products" replace />} />
                <Route path="/intl/:locale/:slug" element={<LocalizedSeoPage />} />
                <Route path="/de/:buyerIntentSlug" element={<BuyerIntentLandingPage />} />
                <Route path="/fr/:buyerIntentSlug" element={<BuyerIntentLandingPage />} />
                <Route path="/nl/:buyerIntentSlug" element={<BuyerIntentLandingPage />} />
                <Route path="/:buyerIntentSlug" element={<BuyerIntentLandingPage />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/journal" element={<Navigate to="/blog" replace />} />
                <Route path="/journal/:slug" element={<Navigate to="/blog" replace />} />
                {LEGACY_REDIRECTS.map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
                <Route path="/login" element={<Navigate to="/auth" replace />} />
                <Route path="/signin" element={<Navigate to="/auth" replace />} />
                <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
                <Route path="/log-in" element={<Navigate to="/auth" replace />} />
                <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="/auth/*" element={<Navigate to="/auth" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes></PlannedCatalogGate></Layout>} />
            </Routes>
          </Suspense>
          <AdminRuntimeGate />
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
