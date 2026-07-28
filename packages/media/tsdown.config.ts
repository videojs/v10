import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import packageJson from './package.json' with { type: 'json' };

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: './src/core/index.ts',
    dom: './src/dom/index.ts',
    'dom/audio-host/index': './src/dom/audio-host/index.ts',
    'dom/media-host/index': './src/dom/media-host/index.ts',
    'dom/video-host/index': './src/dom/video-host/index.ts',
    'dom/custom-media-element/index': './src/dom/custom-media-element/index.ts',
    'dom/media-played-ranges/index': './src/dom/media-played-ranges/index.ts',
    'dom/dash/index': './src/dom/dash/index.ts',
    'dom/hls-js/index': './src/dom/hls-js/index.ts',
    'dom/native-hls/index': './src/dom/native-hls/index.ts',
    'dom/simple-hls-audio-only/index': './src/dom/simple-hls-audio-only/index.ts',
    'dom/simple-hls/index': './src/dom/simple-hls/index.ts',
    'dom/vimeo/index': './src/dom/vimeo/index.ts',
    'dom/mux/index': './src/dom/mux/index.ts',
    'dom/google-cast/index': './src/dom/google-cast/index.ts',
  },
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
    __PLAYER_VERSION__: JSON.stringify(packageJson.version),
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
