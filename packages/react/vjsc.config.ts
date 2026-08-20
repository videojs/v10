import { schema } from '@videojs/core/vjsc';
import { defineConfig } from 'vjsc';
import { resolveReactEntry } from './vjsc/resolve.ts';

export default defineConfig({
  generate: {
    entries: {
      schema,
      output: './vjsc/entries.generated.ts',
      resolve: resolveReactEntry,
    },
  },
});
