import { globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const indexEntries = Object.fromEntries(
  globSync('src/**/index.{ts,tsx}').map((file) => {
    const key = file.replace('src/', '').replace(/\.tsx?$/, '');
    return [key, file];
  })
);

const i18nLocaleEntries = {
  'i18n/locales/en': 'src/i18n/locales/en.ts',
};

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
