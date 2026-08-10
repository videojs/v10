import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'utils',
          include: ['src/**/*.test.ts'],
          exclude: ['src/dom/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'utils/dom',
          include: ['src/dom/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
