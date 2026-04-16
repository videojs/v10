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
          name: 'html',
          include: ['src/**/*.test.ts'],
          exclude: ['src/tests/ssr-edge.test.ts'],
          passWithNoTests: true,
          onConsoleLog: (log: string) => !log.includes('Lit is in dev mode'),
          environment: 'happy-dom',
        },
      },
      {
        extends: true,
        define: {
          __BROWSER__: 'false',
          __DEV__: 'true',
        },
        test: {
          name: 'html/edge',
          include: ['src/tests/ssr-edge.test.ts'],
          environment: 'edge-runtime',
        },
      },
    ],
  },
});
