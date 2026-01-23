import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    onConsoleLog: (log) => !log.includes('Lit is in dev mode'),
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
          name: 'store/lit',
          include: ['src/lit/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        test: {
          name: 'store/react',
          include: ['src/react/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
