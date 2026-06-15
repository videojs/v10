import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import packageJson from './package.json' with { type: 'json' };

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: './src/core/index.ts',
    dom: './src/dom/index.ts',
    'dom/media/media-host/index': './src/dom/media/media-host.ts',
    'dom/media/custom-media-element/index': './src/dom/media/custom-media-element/index.ts',
    // Media
    'dom/media/dash/index': './src/dom/media/dash/index.ts',
    'dom/media/hls/index': './src/dom/media/hls/index.ts',
    'dom/media/native-hls/index': './src/dom/media/native-hls/index.ts',
    'dom/media/simple-hls-audio-only/index': './src/dom/media/simple-hls-audio-only/index.ts',
    'dom/media/simple-hls/index': './src/dom/media/simple-hls/index.ts',
    // Components
    'dom/media/mux/index': './src/dom/media/mux/index.ts',
    'dom/media/google-cast/index': './src/dom/media/google-cast/index.ts',
  },
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
    __PLAYER_VERSION__: JSON.stringify(packageJson.version),
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
