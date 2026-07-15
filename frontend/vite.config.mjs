import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const appVersion = process.env.VITE_APP_VERSION || packageJson.version || "0.0.0";
const appBuildTime = process.env.VITE_APP_BUILD_TIME || new Date().toISOString();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_TIME__: JSON.stringify(appBuildTime),
  },
  build: {
    chunkSizeWarningLimit: 2500,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['record-bookplate-r.svg', 'apple-touch-icon.png', 'logo.svg', 'logo-dark.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png'],
      manifest: {
        name: 'Record',
        short_name: 'Record',
        description: 'Keep the life you live useful.',
        start_url: '/home',
        display: 'standalone',
        background_color: '#090d15',
        theme_color: '#7c5cff',
        orientation: 'any',
        icons: [
          { src: '/logo.svg?v=bookplate-r', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-192.png?v=bookplate-r', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png?v=bookplate-r', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png?v=bookplate-r', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: []
      }
    })
  ],
  server: {
    port: 5173,
    watch: {
      ignored: [
        '**/android/**/build/**',
        '**/android/**/.gradle/**',
      ],
    },
  },
});
