import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import packageJson from './package.json' with { type: 'json' };

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: {
    index: './src/core/index.ts',
    dom: './src/dom/index.ts',
    'dom/media/dash/index': './src/dom/media/dash/index.ts',
    'dom/media/hls/index': './src/dom/media/hls/index.ts',
    'dom/media/custom-media-element/index': './src/dom/media/custom-media-element/index.ts',
    'dom/media/mux/index': './src/dom/media/mux/index.ts',
    'dom/media/native-hls/index': './src/dom/media/native-hls/index.ts',
    'dom/media/simple-hls/index': './src/dom/media/simple-hls/index.ts',
  },
  platform: 'neutral',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
    __PLAYER_VERSION__: JSON.stringify(packageJson.version),
  },
  dts:
    mode === 'dev'
      ? {
          tsgo: true,
          tsconfig: 'tsconfig.dts.json',
        }
      : false,
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
