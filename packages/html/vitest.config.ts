import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    onConsoleLog: (log) => !log.includes('Lit is in dev mode'),
    environment: 'happy-dom',
  },
});
