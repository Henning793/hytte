import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Netlify setter COMMIT_REF; lokalt viser vi bare versjonsnummeret.
const version = process.env.npm_package_version ?? '0.0.0'
const commit = process.env.COMMIT_REF?.slice(0, 7)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(commit ? `${version} (${commit})` : version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      // Ny versjon venter til brukeren trykker «Oppdater» (se src/lib/update.ts).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Hytteappen',
        short_name: 'Hytta',
        description: 'Gjøremål, feil og mangler, handleliste og koder for alle som deler hytta.',
        lang: 'nb',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f1e9',
        theme_color: '#2d5a47',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Viser push-varsler og åpner appen når man trykker på dem.
        importScripts: ['push-sw.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
