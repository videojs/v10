import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    name: 'jsx',
    include: ['src/**/*.test.ts'],
  },
});
