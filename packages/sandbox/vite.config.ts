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
        'html-video': resolve(__dirname, 'src/html-video/index.html'),
        'html-audio': resolve(__dirname, 'src/html-audio/index.html'),
        'html-video-tailwind': resolve(__dirname, 'src/html-video-tailwind/index.html'),
        'html-audio-tailwind': resolve(__dirname, 'src/html-audio-tailwind/index.html'),
        'html-background-video': resolve(__dirname, 'src/html-background-video/index.html'),
        'react-video': resolve(__dirname, 'src/react-video/index.html'),
        'react-audio': resolve(__dirname, 'src/react-audio/index.html'),
        'react-video-tailwind': resolve(__dirname, 'src/react-video-tailwind/index.html'),
        'react-audio-tailwind': resolve(__dirname, 'src/react-audio-tailwind/index.html'),
        'react-background-video': resolve(__dirname, 'src/react-background-video/index.html'),
      },
    },
  },
});
