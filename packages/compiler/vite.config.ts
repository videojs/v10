import { defineConfig } from 'vite-plus';
import { baseConfig } from '../../build/pack.ts';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
  pack: {
    ...baseConfig,
    entry: {
      index: './src/index.ts',
      ast: './src/ast.ts',
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
  },
});
