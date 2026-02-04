import type { Options } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'prod';

const buildModes: BuildMode[] = ['dev', 'prod'];

const createConfig = (mode: BuildMode): Options => ({
  entry: {
    index: './src/index.ts',
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: mode === 'dev',
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'dev',
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
