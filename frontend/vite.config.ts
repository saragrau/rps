import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy /api and /health to the backend during development.
      '/api': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
});
