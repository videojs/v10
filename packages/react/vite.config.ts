import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';
import { LOCALES, localeAliases } from '../core/src/core/i18n/locales.ts';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');
const srcDir = new URL('./src', import.meta.url).pathname;
const srcAlias = { '@': srcDir };
const localeTags = [...LOCALES, ...localeAliases(LOCALES)];

const i18nLocaleEntries = Object.fromEntries([
  ['i18n/locales/all', 'src/i18n/locales/all.ts'],
  ['i18n/locales/all/register', 'src/i18n/locales/all/register.ts'],
  ['i18n/locales/en', 'src/i18n/locales/en.ts'],
  ['i18n/locales/en/register', 'src/i18n/locales/en/register.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `src/i18n/locales/${tag}.ts`]),
  ...localeTags.map((tag) => [`i18n/locales/${tag}/register`, `src/i18n/locales/${tag}/register.ts`]),
]);

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  // Flavor modules sit beside their element's index rather than under one, so
  // they need their own entries to stay separate chunks: importing one flavor
  // must never pull the other engine in with it.
  entry: ['src/**/index.{ts,tsx}', 'src/media/*/{hls-js,spf}.tsx', i18nLocaleEntries],
  deps: {
    alwaysBundle: [/^@videojs\/skins/],
  },
  alias: srcAlias,
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}`, rebuild: false })],
});

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'vp pack',
        dependsOn: workspaceTaskDependencies(),
        input: cachedTaskInputs,
        output: ['dist/**'],
      },
      'test:ci': packageTestTask(),
    },
  },
  define: {
    __DEV__: 'true',
  },
  resolve: {
    alias: srcAlias,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  pack: packageBuildModes.map(createPackConfig),
});
