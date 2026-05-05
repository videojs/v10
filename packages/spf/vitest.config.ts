import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
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
          name: 'media',
          include: ['src/media/**/*.test.ts'],
          exclude: ['src/media/dom/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'network',
          include: ['src/network/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'behaviors',
          include: ['src/playback/behaviors/**/*.test.ts', 'src/playback/actors/**/*.test.ts'],
          exclude: ['src/playback/behaviors/dom/**', 'src/playback/actors/dom/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          // All DOM-bound tests across the package — MSE/VTT primitives,
          // DOM-bound behaviors, DOM-bound actor factories.
          include: [
            'src/media/dom/**/*.test.ts',
            'src/playback/behaviors/dom/**/*.test.ts',
            'src/playback/actors/dom/**/*.test.ts',
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'playback-engines',
          include: ['src/playback/engines/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'types',
          include: [],
          typecheck: {
            enabled: true,
            checker: 'tsgo',
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
    ],
  },
});
