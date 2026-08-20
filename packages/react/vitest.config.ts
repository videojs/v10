import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: 'true',
  },
  resolve: {
    // Matches the `@/*` path mapping in tsconfig.json, so modules that use it
    // (the presets, notably) are importable from tests.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.ts', 'vjsc/**/*.test.ts'],
  },
});
