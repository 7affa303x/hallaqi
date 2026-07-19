import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  // Absolute base — relative `./` broke asset/SW resolution on mobile & preview URLs.
  base: '/',
  plugins: [
    react(),
    VitePWA({
      /**
       * Soft-launch: unregister every old service worker.
       * Stale precached shells were remounting an "old app" after Google OAuth.
       * Re-enable a careful NetworkOnly PWA after the stale fleet is cleared.
       */
      selfDestroying: true,
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: false,
      },
      manifest: false,
      includeAssets: ["logo-icon.png", "logo-symbol.png", "logo-wordmark.png", "push-handler.js", "offline.html", "robots.txt"],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "motion-vendor": ["framer-motion"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
          recharts: ["recharts"],
        },
      },
    },
  },
});
