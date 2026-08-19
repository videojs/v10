import { defineConfig } from 'vjsc';

export default defineConfig({
  generate: {
    schema: {
      source: '@videojs/core/vjsc',
      files: ['./src/core/ui/*/*-component.ts'],
      output: './src/core/ui/schema.generated.ts',
    },
  },
});
