import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['build/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
