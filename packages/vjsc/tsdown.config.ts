import { defineConfig } from 'tsdown';
import { baseConfig } from '../../build/tsdown.ts';

export default defineConfig({
  ...baseConfig,
  entry: {
    index: './src/index.ts',
    'ast/index': './src/ast/index.ts',
    'components/index': './src/components/index.ts',
    'components/jsx-runtime': './src/components/jsx-runtime.ts',
    'components/jsx-dev-runtime': './src/components/jsx-dev-runtime.ts',
    'target/index': './src/target/index.ts',
    'target/jsx-runtime': './src/target/jsx-runtime.ts',
    'target/jsx-dev-runtime': './src/target/jsx-dev-runtime.ts',
    'shadcn/index': './src/shadcn/index.ts',
    'styles/index': './src/styles/index.ts',
    'plugins/index': './src/plugins/index.ts',
    'vite/index': './src/vite/index.ts',
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
