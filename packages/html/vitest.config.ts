import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: 'true',
    __BROWSER__: 'true',
  },
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    onConsoleLog: (log: string) => !log.includes('Lit is in dev mode'),
    environment: 'happy-dom',
  },
});
