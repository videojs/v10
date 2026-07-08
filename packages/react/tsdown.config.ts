import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import { LOCALES } from '../core/src/core/i18n/locales.ts';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

function localeAliases(tags: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const tag of tags) {
    if (!tag.includes('-')) continue;
    const lang = tag.split('-')[0];
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return [...counts].filter(([, count]) => count > 1).map(([lang]) => lang);
}

const localeTags = [...LOCALES, ...localeAliases(LOCALES)];

const i18nLocaleEntries = Object.fromEntries([
  ['i18n/locales/all', 'src/i18n/locales/all.ts'],
  ['i18n/locales/en', 'src/i18n/locales/en.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `src/i18n/locales/${tag}.ts`]),
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
