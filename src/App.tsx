import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import Home from "./pages/Home";
import CookieConsent from "@/components/CookieConsent";
import PageViewTracker from "@/components/PageViewTracker";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const About = lazy(() => import("./pages/About"));
const Products = lazy(() => import("./pages/Products"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const Manufacturing = lazy(() => import("./pages/Manufacturing"));
const Inquiry = lazy(() => import("./pages/Inquiry"));
const RepeatOrder = lazy(() => import("./pages/RepeatOrder"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SeoIndexing = lazy(() => import("./pages/SeoIndexing"));
const LocalizedSeoPage = lazy(() => import("./pages/LocalizedSeoPage"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ProductSpecSheet = lazy(() => import("./pages/ProductSpecSheet"));
const Studio = lazy(() => import("./pages/Studio"));
const Compliance = lazy(() => import("./pages/Compliance"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Connect = lazy(() => import("./pages/Connect"));
const Catalogue = lazy(() => import("./pages/Catalogue"));
const CatalogueCategory = lazy(() => import("./pages/CatalogueCategory"));
const Shortlist = lazy(() => import("./pages/Shortlist"));
const Compare = lazy(() => import("./pages/Compare"));
const FAQ = lazy(() => import("./pages/FAQ"));
const BuyerTrust = lazy(() => import("./pages/BuyerTrust"));
const BuyerResources = lazy(() => import("./pages/BuyerResources"));
const FactoryVideoCall = lazy(() => import("./pages/FactoryVideoCall"));

const queryClient = new QueryClient();

const LEGACY_REDIRECTS = [
  ["/catalogs/master-catalogue-2026.pdf", "/catalogue"],
  ["/sportswear-manufacturer-pakistan", "/products/sportswear"],
  ["/sportswear-manufacturer-sialkot", "/products/sportswear"],
  ["/private-label-sportswear-manufacturer", "/products/sportswear"],
  ["/leatherwear-manufacturer-pakistan", "/products/premium-leather-apparel"],
  ["/leather-jacket-manufacturer", "/products/premium-leather-apparel"],
  ["/lederhosen-manufacturer", "/products/bavarian-trachten-wear"],
  ["/trachten-manufacturer", "/products/bavarian-trachten-wear"],
  ["/oktoberfest-clothing-manufacturer", "/products/bavarian-trachten-wear"],
  ["/austria-lederhosen-manufacturer", "/products/bavarian-trachten-wear"],
  ["/streetwear-manufacturer-pakistan", "/products/streetwear-activewear"],
  ["/uae-sportswear-manufacturer", "/products/sportswear"],
  ["/custom-apparel-manufacturer-pakistan", "/products"],
  ["/germany-apparel-manufacturer", "/products"],
  ["/usa-private-label-clothing-manufacturer", "/products"],
  ["/uk-custom-apparel-manufacturer", "/products"],
  ["/usa-manufacturer", "/products"],
  ["/uk-manufacturer", "/products"],
  ["/germany-manufacturer", "/products"],
  ["/canada-manufacturer", "/products"],
  ["/australia-manufacturer", "/products"],
] as const;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
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
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/de" element={<Navigate to="/" replace />} />
              <Route path="/de/" element={<Navigate to="/" replace />} />
              <Route path="/legacy-home" element={<Navigate to="/" replace />} />

              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />

              <Route
                path="*"
                element={
                  <Layout>
                    <Routes>
                      <Route path="/about" element={<About />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/:slug" element={<CategoryPage />} />
                      <Route path="/products/:categorySlug/:productSlug" element={<ProductDetail />} />
                      <Route path="/products/:categorySlug/:productSlug/spec-sheet" element={<ProductSpecSheet />} />
                      <Route path="/manufacturing" element={<Manufacturing />} />
                      <Route path="/compliance" element={<Compliance />} />
                      <Route path="/buyer-trust" element={<BuyerTrust />} />
                      <Route path="/factory-video-call" element={<FactoryVideoCall />} />
                      <Route path="/resources" element={<BuyerResources />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/sustainability" element={<Navigate to="/inquiry?intent=rfq" replace />} />
                      <Route path="/shipping-returns" element={<Navigate to="/resources#shipping-questions" replace />} />
                      <Route path="/inquiry" element={<Inquiry />} />
                      <Route path="/repeat-order" element={<RepeatOrder />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-of-service" element={<TermsOfService />} />
                      <Route path="/connect" element={<Connect />} />
                      <Route path="/catalogue" element={<Catalogue />} />
                      <Route path="/catalogue/:slug" element={<CatalogueCategory />} />
                      <Route path="/de/katalog" element={<Navigate to="/catalogue" replace />} />
                      <Route path="/de/katalog/:slug" element={<Navigate to="/catalogue" replace />} />
                      <Route path="/catalog" element={<Navigate to="/catalogue" replace />} />
                      <Route path="/seo-indexing" element={<SeoIndexing />} />
                      <Route path="/intl/:locale/:slug" element={<LocalizedSeoPage />} />
                      <Route path="/studio" element={<Studio />} />
                      <Route path="/shortlist" element={<Shortlist />} />
                      <Route path="/compare" element={<Compare />} />
                      <Route path="/blog" element={<Navigate to="/resources" replace />} />
                      <Route path="/blog/:slug" element={<Navigate to="/resources" replace />} />
                      <Route path="/journal" element={<Navigate to="/resources" replace />} />
                      <Route path="/journal/:slug" element={<Navigate to="/resources" replace />} />
                      {LEGACY_REDIRECTS.map(([from, to]) => (
                        <Route key={from} path={from} element={<Navigate to={to} replace />} />
                      ))}
                      <Route path="/login" element={<Navigate to="/auth" replace />} />
                      <Route path="/signin" element={<Navigate to="/auth" replace />} />
                      <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
                      <Route path="/log-in" element={<Navigate to="/auth" replace />} />
                      <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
                      <Route path="/auth/*" element={<Navigate to="/auth" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                }
              />
            </Routes>
          </Suspense>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
