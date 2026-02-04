import type { Options } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'prod' | 'types';

const buildModes: BuildMode[] = ['dev', 'prod', 'types'];

const createConfig = (mode: BuildMode): Options => ({
  entry: {
    index: './src/index.ts',
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'types',
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
