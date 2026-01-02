import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'store',
          include: ['test/**/*.test.ts'],
          exclude: ['test/dom/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'store/dom',
          include: ['test/dom/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
