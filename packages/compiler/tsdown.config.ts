import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    cli: './src/cli.ts',
    'jsx-runtime': './src/jsx-runtime.ts',
    'jsx-dev-runtime': './src/jsx-dev-runtime.ts',
    'plugins/vite': './src/plugins/vite.ts',
    'matchers/index': './src/matchers/index.ts',
    'react/index': './src/react/index.ts',
    'styles/index': './src/styles/index.ts',
    'tailwind/index': './src/tailwind/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  dts: true,
});
