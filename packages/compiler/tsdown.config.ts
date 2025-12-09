import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
  },
  platform: 'node',
  format: 'esm',
  sourcemap: true,
  clean: true,
  dts: {
    oxc: true,
  },
});
