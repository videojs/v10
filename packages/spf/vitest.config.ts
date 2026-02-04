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
          name: 'dom',
          include: ['src/dom/**/*.test.ts'],
          exclude: ['src/dom/media/**/*.test.ts'], // Use browser mode for media tests
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        test: {
          name: 'dom-browser',
          include: ['src/dom/media/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'utils',
          include: ['src/utils/**/*.test.ts'],
        },
      },
    ],
  },
});
