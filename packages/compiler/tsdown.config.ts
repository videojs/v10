import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    cli: './src/cli.ts',
    'bundlers/vite': './src/bundlers/vite.ts',
    'styles/index': './src/styles/index.ts',
    'tailwind/index': './src/tailwind/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  dts: true,
});
