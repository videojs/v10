import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['registry/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
