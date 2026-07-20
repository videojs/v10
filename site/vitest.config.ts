/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { getViteConfig } from 'astro/config';
import type { ViteUserConfig } from 'vitest/config';
import { demoPlaceholderPlugin } from './scripts/replace-demo-placeholders.ts';

// Typed as vitest's `ViteUserConfig` (Vite's config augmented with `test`) and
// passed as a variable: Astro 7's `getViteConfig` param no longer surfaces the
// vitest module augmentation, so a fresh object literal trips an excess-property
// check on `test`. A variable is only checked for structural assignability.
const config: ViteUserConfig = {
  plugins: [demoPlaceholderPlugin(), react()],
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
};

export default getViteConfig(config);
