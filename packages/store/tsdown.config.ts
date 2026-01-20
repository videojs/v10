import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/core/index.ts',
    lit: './src/lit/index.ts',
    react: './src/react/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': new URL('./src/core', import.meta.url).pathname,
  },
  dts: true,
});
