import type { UserConfig } from 'vite-plus/pack';
import { defineConfig } from 'vite-plus/pack';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: 'src/index.ts',
    dom: 'src/dom.ts',
    hls: 'src/playback/engines/hls/index.ts',
    'media-tracks': 'src/media/media-tracks/index.ts',
    'hls-audio': 'src/playback/adapters/hls-audio/index.ts',
    'hls-background-video': 'src/playback/adapters/hls-background-video/index.ts',
    'hls-video': 'src/playback/adapters/hls-video/index.ts',
    'mux-audio': 'src/playback/adapters/mux-audio/index.ts',
    'mux-background-video': 'src/playback/adapters/mux-background-video/index.ts',
    'mux-video': 'src/playback/adapters/mux-video/index.ts',
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
