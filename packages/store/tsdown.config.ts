import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    dom: './src/dom/index.ts',
    lit: './src/lit/index.ts',
    react: './src/react/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  tsconfig: './tsconfig.build.json',
  clean: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  dts: {
    oxc: true,
  },
});
