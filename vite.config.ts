import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { VitePWA } from 'vite-plugin-pwa'

/** Base URL for GitHub Pages project sites: /<repo>/ ; use '/' for user/org root site. */
function appBase(): string {
  const raw = process.env.VITE_BASE_PATH?.trim()
  if (!raw || raw === '/') return '/'
  const inner = raw.replace(/^\/+|\/+$/g, '')
  return `/${inner}/`
}

const base = appBase()

export default defineConfig({
  base,
  plugins: [
    solid(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Simple Timer',
        short_name: 'Timer',
        description: 'A simple MM:SS countdown timer',
        theme_color: '#2ba8f5',
        background_color: '#f7f3ea',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: base === '/' ? '/index.html' : `${base}index.html`,
      },
    }),
  ],
})
