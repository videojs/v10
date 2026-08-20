import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['vjsc/**/*.test.ts'],
  },
});
