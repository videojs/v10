import { defineConfig } from 'vite-plus';

export default defineConfig({
  define: {
    __DEV__: 'true',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
