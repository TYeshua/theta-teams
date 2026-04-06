import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'THETA System',
        short_name: 'THETA',
        description: 'Time & Habits Execution Tracking Algorithm',
        theme_color: '#050505', // Fundo OLED do THETA
        background_color: '#050505',
        display: 'standalone', // Força tela cheia (estilo app nativo no iOS)
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true, // CRUCIAL: Permite que o seu iPhone acesse o servidor via rede Wi-Fi
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Seu backend FastAPI
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})