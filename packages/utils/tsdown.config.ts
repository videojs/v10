import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    array: './src/array/index.ts',
    dom: './src/dom/index.ts',
    events: './src/events/index.ts',
    function: './src/function/index.ts',
    number: './src/number/index.ts',
    object: './src/object/index.ts',
    predicate: './src/predicate/index.ts',
    string: './src/string/index.ts',
    style: './src/style/index.ts',
    time: './src/time/index.ts',
    types: './src/types/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  dts: true,
});
