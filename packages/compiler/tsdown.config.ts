import { defineConfig } from 'tsdown';
import { baseConfig } from '../../build/tsdown.ts';

export default defineConfig({
  ...baseConfig,
  entry: {
    index: './src/index.ts',
    ast: './src/ast.ts',
    artifacts: './src/artifacts/index.ts',
    'bundlers/vite': './src/bundlers/vite.ts',
  },
  platform: 'node',
  // The package is ESM, so `.js`/`.d.ts` match its checked-in export map.
  fixedExtension: false,
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  dts: true,
  deps: {
    neverBundle: [/^node:/],
  },
});
