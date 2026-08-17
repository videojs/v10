import { defineConfig } from '@videojs/compiler';

import { resolveHtmlTargets } from './compiler/resolve.ts';

export default defineConfig({
  generate: {
    target: {
      files: ['./src/define/{ui,media}/*.ts', './src/define/i18n.ts'],
      output: './compiler/components.generated.ts',
      resolve: resolveHtmlTargets,
    },
  },
});
