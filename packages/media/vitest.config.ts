import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: 'true',
    __PLAYER_VERSION__: JSON.stringify('10.0.0-beta.25'),
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'media',
          include: ['src/core/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'media/dom',
          include: ['src/dom/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
