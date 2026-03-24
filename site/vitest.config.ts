/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  // @ts-expect-error — Astro 5 uses Vite 6 types, but @vitejs/plugin-react ships Vite 8 types. Compatible at runtime.
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**', 'src/components/**', 'src/types/**', 'scripts/api-docs-builder/src/**'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/test/**'],
    },
  },
});
