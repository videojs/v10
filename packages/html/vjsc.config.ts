import { defineConfig } from 'vjsc';

import { resolveHtmlTargets } from './vjsc/resolve.ts';

export default defineConfig({
  generate: {
    target: {
      files: ['./src/define/{ui,media}/*.ts', './src/define/i18n.ts'],
      output: './vjsc/components.generated.ts',
      resolve: resolveHtmlTargets,
    },
  },
});
