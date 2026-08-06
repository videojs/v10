import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'bundlers/vite': './src/bundlers/vite.ts',
  },
  platform: 'neutral',
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
