import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build is written straight into the Spring Boot app, so a single
// `java -jar` serves both the API and the UI to everyone on the LAN.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
});
