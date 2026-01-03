import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'store',
          include: ['src/core/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'store/dom',
          include: ['src/dom/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        test: {
          name: 'store/lit',
          include: ['src/lit/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
