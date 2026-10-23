import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt', injectRegister: null,
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: 'ထွယ်ဂျီဂွမ်Caculator', short_name: 'ထွယ်ဂျီဂွမ်',
      description: 'A clear severance calculator for E-9 workers in Korea.',
      theme_color: '#123c35', background_color: '#f7f8f4', display: 'standalone', start_url: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      navigateFallbackDenylist: [/^\/api\//, /^\/v1\//, /^\/health/],
      runtimeCaching: [],
      cleanupOutdatedCaches: true,
    },
    devOptions: { enabled: false },
  })],
  server: { port: 5173, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') } } },
});
