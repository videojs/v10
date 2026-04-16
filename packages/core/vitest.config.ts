import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: 'true',
    __BROWSER__: 'true',
  },
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
          exclude: ['src/dom/media/tests/ssr-edge.test.ts'],
          environment: 'jsdom',
          setupFiles: ['src/dom/tests/setup.ts'],
        },
      },
      {
        extends: true,
        define: {
          __BROWSER__: 'false',
          __DEV__: 'true',
        },
        test: {
          name: 'core/edge',
          include: ['src/dom/media/tests/ssr-edge.test.ts'],
          environment: 'edge-runtime',
        },
      },
    ],
  },
});
