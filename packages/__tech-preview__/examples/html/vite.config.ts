import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  server: {
    port: 5174,
  },
  optimizeDeps: {
    exclude: ['@vjs/html'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        minimal: resolve(__dirname, 'minimal.html'),
        'minimal-eject': resolve(__dirname, 'minimal-eject.html'),
        frosted: resolve(__dirname, 'frosted.html'),
        'frosted-eject': resolve(__dirname, 'frosted-eject.html'),
      },
    },
  },
});
