import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import packageJson from './package.json' with { type: 'json' };

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: './src/core/index.ts',
    'media-tracks': './src/core/media-tracks/index.ts',
    dom: './src/dom/index.ts',
    'dom/audio-host/index': './src/dom/audio-host/index.ts',
    'dom/media-host/index': './src/dom/media-host/index.ts',
    'dom/video-host/index': './src/dom/video-host/index.ts',
    'dom/custom-media-element/index': './src/dom/custom-media-element/index.ts',
    'dom/media-played-ranges/index': './src/dom/media-played-ranges/index.ts',
    'dom/dash/index': './src/dom/dash/index.ts',
    'dom/hls-js/index': './src/dom/hls-js/index.ts',
    'dom/native-hls/index': './src/dom/native-hls/index.ts',
    'dom/cloudflare/index': './src/dom/cloudflare/index.ts',
    'dom/shaka/index': './src/dom/shaka/index.ts',
    'dom/spotify/index': './src/dom/spotify/index.ts',
    'dom/tiktok/index': './src/dom/tiktok/index.ts',
    'dom/twitch/index': './src/dom/twitch/index.ts',
    'dom/vimeo/index': './src/dom/vimeo/index.ts',
    'dom/wistia/index': './src/dom/wistia/index.ts',
    'dom/youtube/index': './src/dom/youtube/index.ts',
    'dom/mux/index': './src/dom/mux/index.ts',
    'dom/mux/source/index': './src/dom/mux/source/index.ts',
    'dom/google-cast/index': './src/dom/google-cast/index.ts',
  },
  // `WistiaMedia` extends Wistia's own element, so its declarations reach for the package's types. Those do
  // not bundle: they import a file the published package omits, and pull in `preact`'s CommonJS ones. Left
  // as an import for the consumer's compiler to resolve, which is where it resolves correctly.
  external: [/^@wistia\//, /^preact/],
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
    __PLAYER_VERSION__: JSON.stringify(packageJson.version),
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
