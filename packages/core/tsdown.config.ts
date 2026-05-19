import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import packageJson from './package.json' with { type: 'json' };
import { BUILT_IN_LOCALES } from './src/core/i18n/built-in-locales.ts';

const localeEntries = Object.fromEntries([
  ['i18n/locales/en', './src/core/i18n/locales/en.ts'],
  ...BUILT_IN_LOCALES.map((tag) => [`i18n/locales/${tag}`, `./src/core/i18n/locales/${tag}.ts`]),
  ['i18n/locales/pt', './src/core/i18n/locales/pt.ts'],
  ['i18n/locales/zh', './src/core/i18n/locales/zh.ts'],
]);

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: './src/core/index.ts',
    i18n: './src/core/i18n/index.ts',
    ...localeEntries,
    dom: './src/dom/index.ts',
    'dom/media/dash/index': './src/dom/media/dash/index.ts',
    'dom/media/hls/index': './src/dom/media/hls/index.ts',
    'dom/media/custom-media-element/index': './src/dom/media/custom-media-element/index.ts',
    'dom/media/mux/index': './src/dom/media/mux/index.ts',
    'dom/media/native-hls/index': './src/dom/media/native-hls/index.ts',
    'dom/media/simple-hls/index': './src/dom/media/simple-hls/index.ts',
  },
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
    __PLAYER_VERSION__: JSON.stringify(packageJson.version),
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
