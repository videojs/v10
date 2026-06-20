import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    cli: './src/cli.ts',
    'bundlers/vite': './src/bundlers/vite.ts',
    diagnostics: './src/diagnostics.ts',
    'jsx/index': './src/jsx/index.ts',
    'styles/index': './src/styles/index.ts',
    'tailwind/index': './src/tailwind/index.ts',
    'transforms/index': './src/transforms/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  dts: true,
});
