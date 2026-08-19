import { defineConfig } from 'tsdown';
import { baseConfig } from '../../build/tsdown.ts';

export default defineConfig({
  ...baseConfig,
  entry: {
    index: './src/index.ts',
    cli: './src/cli.ts',
    ast: './src/ast.ts',
    'catalog/index': './src/catalog/index.ts',
    'components/index': './src/components/index.ts',
    'components/jsx-runtime': './src/components/jsx-runtime.ts',
    'components/jsx-dev-runtime': './src/components/jsx-dev-runtime.ts',
    'components/registry': './src/components/registry/index.ts',
    'components/registry/jsx-runtime': './src/components/registry/jsx-runtime.ts',
    'components/registry/jsx-dev-runtime': './src/components/registry/jsx-dev-runtime.ts',
    'generate/index': './src/generate/index.ts',
    'shadcn/index': './src/shadcn/index.ts',
    'styles/index': './src/styles/index.ts',
    'bundlers/vite': './src/bundlers/vite.ts',
  },
  platform: 'node',
  // The package is ESM, so `.js`/`.d.ts` match its checked-in export map.
  fixedExtension: false,
  format: 'es',
  sourcemap: true,
  banner: ({ fileName }) => (fileName === 'cli.js' ? { js: '#!/usr/bin/env node' } : undefined),
  clean: true,
  hash: false,
  unbundle: true,
  dts: true,
  deps: {
    neverBundle: [/^node:/],
  },
});
