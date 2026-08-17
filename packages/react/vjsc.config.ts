import { defineConfig } from '@videojs/compiler';
import { components } from '@videojs/core/components';

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
