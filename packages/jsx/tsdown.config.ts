import { defineConfig } from 'tsdown';
import { neutralLibraryConfig } from '../../build/tsdown.ts';

export default defineConfig({
  ...neutralLibraryConfig,
  entry: {
    index: './src/index.ts',
    'jsx-runtime': './src/jsx-runtime.ts',
    'jsx-dev-runtime': './src/jsx-dev-runtime.ts',
  },
});
