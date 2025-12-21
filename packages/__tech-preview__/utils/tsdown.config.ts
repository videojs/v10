import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    dom: './src/dom/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  dts: {
    oxc: true,
  },
});
