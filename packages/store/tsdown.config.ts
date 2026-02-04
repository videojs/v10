import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'prod' | 'types';

const buildModes: BuildMode[] = ['dev', 'prod', 'types'];

const createConfig = (mode: BuildMode) => ({
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
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'types',
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
