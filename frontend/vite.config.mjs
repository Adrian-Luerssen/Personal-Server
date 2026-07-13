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
      includeAssets: ['favicon.svg', 'logo.svg', 'logo-dark.svg'],
      manifest: {
        name: 'Personal Record',
        short_name: 'Record',
        description: 'Your records, kept useful.',
        start_url: '/home',
        display: 'standalone',
        background_color: '#f2eee6',
        theme_color: '#a33b2b',
        orientation: 'any',
        icons: [
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
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
