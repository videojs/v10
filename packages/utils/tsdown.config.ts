import { defineConfig } from 'tsdown';
import { neutralLibraryConfig } from '../../build/tsdown.ts';

export default defineConfig({
  ...neutralLibraryConfig,
  entry: {
    array: './src/array/index.ts',
    dom: './src/dom/index.ts',
    events: './src/events/index.ts',
    function: './src/function/index.ts',
    number: './src/number/index.ts',
    object: './src/object/index.ts',
    percent: './src/percent/index.ts',
    predicate: './src/predicate/index.ts',
    string: './src/string/index.ts',
    style: './src/style/index.ts',
    time: './src/time/index.ts',
    types: './src/types/index.ts',
  },
});
