import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  plugins: [tailwindcss(), react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['@videojs/core', '@videojs/html', '@videojs/react', '@videojs/store', '@videojs/utils'],
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        core: resolve(__dirname, 'src/core/index.html'),
        html: resolve(__dirname, 'src/html/index.html'),
        react: resolve(__dirname, 'src/react/index.html'),
      },
    },
  },
});
