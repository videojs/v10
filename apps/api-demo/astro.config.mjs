// @ts-check
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // The workspace media packages ship ESM; let Vite resolve them directly
      // instead of pre-bundling (mirrors the main site config).
      exclude: ['@videojs/core', '@videojs/react'],
      // react-dom (CJS) must be pre-bundled so its named exports are exposed as
      // ESM bindings to the @astrojs/react client renderer.
      include: ['react-dom', 'react-dom/client'],
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  },
});
