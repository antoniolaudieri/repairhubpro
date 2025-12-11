import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw-source.ts',
      registerType: "autoUpdate",
      injectRegister: 'auto',
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id: "app.lablinkriparo",
        name: "LabLinkRiparo - Gestionale Riparazioni",
        short_name: "LabLinkRiparo",
        description: "Piattaforma Gestionale per Centri Riparazione",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        start_url: "/?source=pwa",
        scope: "/",
        lang: "it",
        dir: "ltr",
        categories: ["business", "productivity", "utilities"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        screenshots: [
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "narrow",
            label: "LabLinkRiparo Dashboard"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "wide",
            label: "LabLinkRiparo Dashboard"
          }
        ],
        prefer_related_applications: false,
        display_override: ["standalone", "minimal-ui"]
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
