import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: 'true',
  },
  test: {
    passWithNoTests: true,
    onConsoleLog: (log) => !log.includes('Lit is in dev mode'),
    environment: 'happy-dom',
    // Some define/* tests dynamically `await import()` composite modules
    // that pull a large graph through Vite's transform pipeline. Under
    // `pnpm test` at the workspace root (turbo runs every package's
    // vitest in parallel, plus Chromium for spf/dom), CPU contention
    // can push a single import past Vitest's 5s default. Raise it so the
    // tests stay reliable under load without masking a real regression —
    // anything approaching this ceiling would still fail.
    testTimeout: 15_000,
  },
});
