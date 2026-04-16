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
          name: 'react',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/tests/ssr-edge.test.ts'],
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        define: {
          __BROWSER__: 'false',
          __DEV__: 'true',
        },
        test: {
          name: 'react/edge',
          include: ['src/tests/ssr-edge.test.ts'],
          environment: 'edge-runtime',
        },
      },
    ],
  },
});
