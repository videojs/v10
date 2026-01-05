import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          include: ['src/core/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'core/dom',
          include: ['src/dom/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
