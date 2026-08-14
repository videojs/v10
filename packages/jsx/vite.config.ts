import { defineConfig } from 'vite-plus';
import { neutralLibraryConfig } from '../../build/pack.ts';

export default defineConfig({
  test: {
    name: 'jsx',
    include: ['src/**/*.test.ts'],
  },
  pack: {
    ...neutralLibraryConfig,
    entry: {
      index: './src/index.ts',
      'jsx-runtime': './src/jsx-runtime.ts',
      'jsx-dev-runtime': './src/jsx-dev-runtime.ts',
    },
  },
});
