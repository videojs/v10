import { defineConfig } from 'vjsc';

export default defineConfig({
  generate: {
    components: {
      source: '@videojs/core/components',
      components: ['./src/core/ui/*/*-component.ts'],
      output: './src/core/ui/components.generated.ts',
    },
  },
});
