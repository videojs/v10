import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    events: './src/events/index.ts',
    predicate: './src/predicate/index.ts',
    types: './src/types/index.ts',
    object: './src/object/index.ts',
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
