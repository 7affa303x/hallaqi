import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { hallaqiBuildPlugin } from "./vite-plugin-hallaqi-build"

export default defineConfig({
  // Absolute base — relative `./` broke asset/SW resolution on mobile & preview URLs.
  base: '/',
  plugins: [
    hallaqiBuildPlugin(),
    react(),
    VitePWA({
      /**
       * Push-only SW lives in public/sw.js (no Workbox precache).
       * Disabling plugin SW generation — selfDestroying broke Web Push.
       */
      disable: true,
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: {
        enabled: false,
      },
      manifest: false,
      includeAssets: ["logo-icon.svg", "logo-symbol.svg", "logo-wordmark.svg", "push-handler.js", "sw.js", "offline.html", "robots.txt", "auth-shell.js", "oauth-guard.js", "sw-register.js"],
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
