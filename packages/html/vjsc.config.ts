import { defineConfig } from 'vjsc';

import { resolveHtmlEntries } from './vjsc/resolve.ts';

export default defineConfig({
  generate: {
    entries: {
      files: ['./src/define/{ui,media}/*.ts', './src/define/i18n.ts'],
      output: './vjsc/entries.generated.ts',
      resolve: resolveHtmlEntries,
    },
  },
});
