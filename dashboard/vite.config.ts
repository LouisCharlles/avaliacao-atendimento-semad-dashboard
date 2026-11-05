import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Em desenvolvimento, encaminha /api para a API local (mesma origem → cookie de sessão funciona).
    proxy: { '/api': { target: process.env.VITE_PROXY_API ?? 'http://localhost:3000', changeOrigin: false } },
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
