import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['build/**/*.test.ts', 'vjsc/**/*.test.ts'],
  },
});
