import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

function verifiedReleaseMetadata(): Plugin {
  return {
    name: "irha-verified-release-metadata",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(/<title>[\s\S]*?<\/title>/i, "<title>Irha Apparels — B2B Custom Apparel Manufacturer in Sialkot</title>")
        .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, '<meta name="description" content="Custom B2B apparel manufacturing in Sialkot, Pakistan for brands, wholesalers, importers and private-label buyers. Requirements are reviewed before commercial commitments." />')
        .replace(/\s*<meta name="keywords"[^>]*>/i, "")
        .replace(/\s*<link rel="alternate" hreflang="de"[^>]*>/gi, "")
        .replace(/\s*<meta name="x-irha-(?:build|release)"[^>]*>/gi, '<meta name="x-irha-release" content="gate4-2026-07-06-r3" />')
        .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, '<meta property="og:title" content="Irha Apparels — B2B Custom Apparel Manufacturer" />')
        .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, '<meta property="og:description" content="Custom apparel programs for brands, wholesalers, importers and private-label buyers. Requirements are reviewed before commercial commitments." />')
        .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, '<meta name="twitter:title" content="Irha Apparels — B2B Custom Apparel Manufacturer" />')
        .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, '<meta name="twitter:description" content="Custom apparel manufacturing in Sialkot, Pakistan for B2B buyers." />')
        .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [verifiedReleaseMetadata(), react(), imagetools(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["lucide-react", "@radix-ui/react-slot", "@radix-ui/react-dialog"],
          "query-vendor": ["@tanstack/react-query"],
        },
      },
    },
  },
}));
