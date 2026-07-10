import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import { LOCALES, localeAliases } from '../core/src/core/i18n/locales.ts';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const localeTags = [...LOCALES, ...localeAliases(LOCALES)];

const i18nLocaleEntries = Object.fromEntries([
  ['i18n/locales/all', 'src/i18n/locales/all.ts'],
  ['i18n/locales/all/register', 'src/i18n/locales/all/register.ts'],
  ['i18n/locales/en', 'src/i18n/locales/en.ts'],
  ['i18n/locales/en/register', 'src/i18n/locales/en/register.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `src/i18n/locales/${tag}.ts`]),
  ...localeTags.map((tag) => [`i18n/locales/${tag}/register`, `src/i18n/locales/${tag}/register.ts`]),
]);

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: ['src/**/index.{ts,tsx}', i18nLocaleEntries],
  noExternal: [/^@videojs\/skins/],
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}` })],
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
