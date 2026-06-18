import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";

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

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [pathname]);
  return null;
}

// SEO landing slugs handled by SeoLanding template
const SEO_LANDING_SLUGS = [
  "sportswear-manufacturer-pakistan",
  "sportswear-manufacturer-sialkot",
  "private-label-sportswear-manufacturer",
  "leatherwear-manufacturer-pakistan",
  "leather-jacket-manufacturer",
  "lederhosen-manufacturer",
  "trachten-manufacturer",
  "oktoberfest-clothing-manufacturer",
  "streetwear-manufacturer-pakistan",
  "custom-apparel-manufacturer-pakistan",
];

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
          <Layout>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:slug" element={<CategoryPage />} />
                <Route path="/manufacturing" element={<Manufacturing />} />
                <Route path="/sustainability" element={<Sustainability />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/journal/:slug" element={<JournalArticle />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/inquiry" element={<Inquiry />} />
                <Route path="/contact" element={<Contact />} />
                {SEO_LANDING_SLUGS.map((slug) => (
                  <Route key={slug} path={`/${slug}`} element={<SeoLanding />} />
                ))}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
