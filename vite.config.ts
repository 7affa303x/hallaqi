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
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: false,
      includeAssets: ["logo-icon.png", "logo-symbol.png", "logo-wordmark.png", "push-handler.js", "offline.html", "robots.txt"],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        offlineGoogleAnalytics: false,
        importScripts: ["/push-handler.js"],
        globPatterns: ["**/*.{js,css,html,png,svg,webp,woff2}"],
        runtimeCaching: [
          {
            // Always prefer network for the app shell so phones don't stick on an old build.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: "NetworkFirst",
            options: {
              cacheName: "hallaqi-navigations",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//,
            handler: "CacheFirst",
            options: {
              cacheName: "hallaqi-images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
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
