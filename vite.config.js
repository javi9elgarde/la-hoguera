import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Se publica en https://javi9elgarde.github.io/la-hoguera/
export default defineConfig({
  base: '/la-hoguera/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'La Hoguera',
        short_name: 'La Hoguera',
        description: 'Organización del hogar en pareja',
        lang: 'es',
        theme_color: '#fff4e6',
        background_color: '#fff4e6',
        display: 'standalone',
        start_url: '/la-hoguera/',
        scope: '/la-hoguera/',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallback: '/la-hoguera/index.html' },
    }),
  ],
  test: { include: ['test/**/*.test.js'] },
})
