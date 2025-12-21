import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    media: './src/media/index.ts',
    store: './src/store/index.ts',
  },
  platform: 'browser',
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
