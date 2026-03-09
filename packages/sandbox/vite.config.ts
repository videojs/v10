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
    exclude: [
      '@videojs/core',
      '@videojs/html',
      '@videojs/icons',
      '@videojs/react',
      '@videojs/spf',
      '@videojs/spf/dom',
      '@videojs/spf/playback-engine',
      '@videojs/store',
      '@videojs/utils',
    ],
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        core: resolve(__dirname, 'src/core/index.html'),
        html: resolve(__dirname, 'src/html/index.html'),
        'html-background': resolve(__dirname, 'src/html-background/index.html'),
        'html-tailwind': resolve(__dirname, 'src/html-tailwind/index.html'),
        react: resolve(__dirname, 'src/react/index.html'),
        'react-background': resolve(__dirname, 'src/react-background/index.html'),
        'react-tailwind': resolve(__dirname, 'src/react-tailwind/index.html'),
        'spf-segment-loading': resolve(__dirname, 'src/spf-segment-loading/index.html'),
        'spf-html': resolve(__dirname, 'src/spf-html/index.html'),
        'spf-react': resolve(__dirname, 'src/spf-react/index.html'),
      },
    },
  },
});
