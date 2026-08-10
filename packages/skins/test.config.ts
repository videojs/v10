import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    include: ['build/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
