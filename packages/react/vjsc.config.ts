import { components } from '@videojs/core/components';
import { defineConfig } from 'vjsc';

export default defineConfig({
  generate: {
    target: {
      components,
      output: './compiler/components.generated.ts',

      resolve({ component, part }) {
        return {
          import: {
            from: '@videojs/react',
            name: component,
            ...(part ? { path: part.split('.') } : {}),
          },
        };
      },
    },
  },
});
