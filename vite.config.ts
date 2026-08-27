import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'pwa-192x192.png', 'pwa-512x512.png'], 
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Agro POPs',
        short_name: 'AgroPOPs',
        description: 'Gestão fiscal e financeira para o produtor rural',
        theme_color: '#2E7D32',
        background_color: '#F5F7FA',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});





