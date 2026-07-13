import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { rmSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

function verifiedReleaseMetadata(): Plugin {
  return {
    name: "irha-verified-release-metadata",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(/<title>[\s\S]*?<\/title>/i, "<title>Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers</title>")
        .replace(/<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, '<meta data-irha-fallback-seo="true" name="description" content="OEM, ODM and private-label apparel manufacturer in Sialkot, Pakistan. Custom cut & sew, embroidery, printing, private label and export support for brands and importers worldwide." />')
        .replace(/\s*<meta name="keywords"[^>]*>/i, "")
        .replace(/\s*<link rel="alternate" hreflang="de"[^>]*>/gi, "")
        .replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, '<meta data-irha-fallback-seo="true" property="og:title" content="Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers" />')
        .replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, '<meta data-irha-fallback-seo="true" property="og:description" content="OEM, ODM and private-label apparel manufacturing in Sialkot, Pakistan for brands, wholesalers and importers worldwide." />')
        .replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, '<meta data-irha-fallback-seo="true" name="twitter:title" content="Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers" />')
        .replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, '<meta data-irha-fallback-seo="true" name="twitter:description" content="OEM, ODM and private-label apparel manufacturing in Sialkot, Pakistan for global B2B buyers." />')
        .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
    },
  };
}

function retireLegacyCatalogueFiles(): Plugin {
  return {
    name: "irha-retire-legacy-catalogue-files",
    apply: "build",
    closeBundle() {
      rmSync(path.resolve(__dirname, "dist/catalogs"), { recursive: true, force: true });
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    verifiedReleaseMetadata(),
    retireLegacyCatalogueFiles(),
    react(),
    imagetools(),
    ...(mode === "development" ? [mcpPlugin(), componentTagger()] : []),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    minify: "oxc",
  },
}));
