import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/core/index.ts',
    dom: './src/dom/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': new URL('./src/core', import.meta.url).pathname,
  },
  dts: {
    incremental: true,
  },
});
