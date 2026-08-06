import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'jsx',
    include: ['src/**/*.test.ts'],
  },
});
