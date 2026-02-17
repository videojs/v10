import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: {
    index: './src/core/index.ts',
    dom: './src/dom/index.ts',
    'dom/media/hls': './src/dom/media/hls.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  alias: {
    '@': new URL('./src/core', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: {
    build: true,
    // Needed to preserve the MediaApiMixin return types.
    tsconfig: 'src/dom/tsconfig.json',
  },
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
