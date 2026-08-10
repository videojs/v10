import { defineConfig } from 'vite-plus/pack';
import { neutralLibraryConfig } from '../../build/pack.ts';

export default defineConfig({
  ...neutralLibraryConfig,
  entry: {
    index: './src/index.ts',
    'jsx-runtime': './src/jsx-runtime.ts',
    'jsx-dev-runtime': './src/jsx-dev-runtime.ts',
  },
});
