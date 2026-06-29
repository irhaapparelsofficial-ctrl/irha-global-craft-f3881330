import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import LederhosenHome from "./pages/LederhosenHome";
import Index from "./pages/Index";
import CookieConsent from "@/components/CookieConsent";
import PageViewTracker from "@/components/PageViewTracker";
import PrivacyPolicy from "./pages/PrivacyPolicy";

// Route-level code splitting for faster initial paint
const About = lazy(() => import("./pages/About"));
const Products = lazy(() => import("./pages/Products"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const Manufacturing = lazy(() => import("./pages/Manufacturing"));
const Inquiry = lazy(() => import("./pages/Inquiry"));
const Contact = lazy(() => import("./pages/Contact"));
const Sustainability = lazy(() => import("./pages/Sustainability"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Journal = lazy(() => import("./pages/Journal"));
const JournalArticle = lazy(() => import("./pages/JournalArticle"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const SeoLanding = lazy(() => import("./pages/SeoLanding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SeoIndexing = lazy(() => import("./pages/SeoIndexing"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Studio = lazy(() => import("./pages/Studio"));
const Compliance = lazy(() => import("./pages/Compliance"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ShippingReturns = lazy(() => import("./pages/ShippingReturns"));
const Connect = lazy(() => import("./pages/Connect"));
const Catalogue = lazy(() => import("./pages/Catalogue"));
const CatalogueCategory = lazy(() => import("./pages/CatalogueCategory"));

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [pathname]);
  return null;
}

// SEO landing slugs handled by SeoLanding template (auto-derived from data)
import { SEO_PAGE_SLUGS } from "@/lib/seoPages";
import { COUNTRY_SLUGS } from "@/lib/countryLandings";
const SEO_LANDING_SLUGS = SEO_PAGE_SLUGS;
const CountryLanding = lazy(() => import("./pages/CountryLanding"));

const PageFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <PageViewTracker />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* New Lederhosen-focused homepage — no shared Layout, owns its own chrome */}
              <Route path="/" element={<LederhosenHome />} />
              <Route path="/de" element={<LederhosenHome />} />
              <Route path="/de/" element={<LederhosenHome />} />
              <Route path="/legacy-home" element={<Layout><Index /></Layout>} />

              {/* All other routes keep the legacy Layout (Navbar/Footer/FloatingActions/etc) */}
              <Route path="*" element={
                <Layout>
                  <Routes>
                    <Route path="/about" element={<About />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:slug" element={<CategoryPage />} />
                    <Route path="/products/:categorySlug/:productSlug" element={<ProductDetail />} />
                    <Route path="/manufacturing" element={<Manufacturing />} />
                    <Route path="/sustainability" element={<Sustainability />} />
                    <Route path="/compliance" element={<Compliance />} />
                    <Route path="/journal" element={<Journal />} />
                    <Route path="/journal/:slug" element={<JournalArticle />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/inquiry" element={<Inquiry />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/shipping-returns" element={<ShippingReturns />} />
                    <Route path="/connect" element={<Connect />} />
                    <Route path="/catalogue" element={<Catalogue />} />
                    <Route path="/catalogue/:slug" element={<CatalogueCategory />} />
                    <Route path="/de/katalog" element={<Catalogue />} />
                    <Route path="/de/katalog/:slug" element={<CatalogueCategory />} />
                    <Route path="/catalog" element={<Navigate to="/catalogue" replace />} />
                    <Route path="/seo-indexing" element={<SeoIndexing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/studio" element={<Studio />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/login" element={<Navigate to="/auth" replace />} />
                    <Route path="/signin" element={<Navigate to="/auth" replace />} />
                    <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
                    <Route path="/log-in" element={<Navigate to="/auth" replace />} />
                    <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
                    <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
                    <Route path="/auth/*" element={<Navigate to="/auth" replace />} />
                    {SEO_LANDING_SLUGS.map((slug) => (
                      <Route key={slug} path={`/${slug}`} element={<SeoLanding />} />
                    ))}
                    {COUNTRY_SLUGS.map((slug) => (
                      <Route key={slug} path={`/${slug}`} element={<CountryLanding />} />
                    ))}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </Suspense>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
