import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import packageJson from './package.json' with { type: 'json' };
import { LOCALES, localeAliases } from './src/core/i18n/locales.ts';

const localeTags = [...LOCALES, ...localeAliases(LOCALES)];

const localeEntries = Object.fromEntries([
  ['i18n/locales/all', './src/core/i18n/locales/all.ts'],
  ['i18n/locales/en', './src/core/i18n/locales/en.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `./src/core/i18n/locales/${tag}.ts`]),
]);

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: './src/core/index.ts',
    'media/predicate': './src/core/media/predicate.ts',
    i18n: './src/core/i18n/index.ts',
    ...localeEntries,
    dom: './src/dom/index.ts',
    'dom/media/media-host/index': './src/dom/media/media-host.ts',
    'dom/media/custom-media-element/index': './src/dom/media/custom-media-element/index.ts',
    'dom/media/media-played-ranges/index': './src/dom/media/media-played-ranges/index.ts',
    // Media
    'dom/media/dash/index': './src/dom/media/dash/index.ts',
    'dom/media/hls-js/index': './src/dom/media/hls-js/index.ts',
    'dom/media/native-hls/index': './src/dom/media/native-hls/index.ts',
    'dom/media/simple-hls-audio-only/index': './src/dom/media/simple-hls-audio-only/index.ts',
    'dom/media/simple-hls/index': './src/dom/media/simple-hls/index.ts',
    'dom/media/vimeo/index': './src/dom/media/vimeo/index.ts',
    'dom/media/youtube/index': './src/dom/media/youtube/index.ts',
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
