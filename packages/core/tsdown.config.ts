import type { Options } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'prod';

const buildModes: BuildMode[] = ['dev', 'prod'];

const createConfig = (mode: BuildMode): Options => ({
  entry: {
    index: './src/core/index.ts',
    dom: './src/dom/index.ts',
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
  dts: mode === 'dev',
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
