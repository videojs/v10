import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: 'true',
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
          environment: 'jsdom',
          setupFiles: ['src/dom/tests/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'scripts',
          include: ['scripts/**/*.test.ts'],
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
            include: ['src/core/ui/**/*.test-d.tsx'],
            tsconfig: 'src/core/ui/tests/tsconfig.json',
          },
        },
      },
    ],
  },
});
