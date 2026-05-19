import { globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import { BUILT_IN_LOCALES } from '../core/src/core/i18n/built-in-locales.ts';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const indexEntries = Object.fromEntries(
  globSync('src/**/index.{ts,tsx}').map((file) => {
    const key = file.replace('src/', '').replace(/\.tsx?$/, '');
    return [key, file];
  })
);

const i18nLocaleEntries = Object.fromEntries([
  ['i18n/all', 'src/i18n/all.ts'],
  ['i18n/locales/en', 'src/i18n/locales/en.ts'],
  ...BUILT_IN_LOCALES.map((tag) => [`i18n/locales/${tag}`, `src/i18n/locales/${tag}.ts`]),
  ['i18n/locales/pt', 'src/i18n/locales/pt.ts'],
  ['i18n/locales/zh', 'src/i18n/locales/zh.ts'],
]);

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: {
    ...indexEntries,
    ...i18nLocaleEntries,
  },
  noExternal: [/^@videojs\/skins/],
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}` })],
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
