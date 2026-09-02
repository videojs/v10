import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';
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

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  // Flavor modules sit beside their element's index rather than under one, so
  // they need their own entries to stay separate chunks: importing one flavor
  // must never pull the other engine in with it.
  entry: ['src/**/index.{ts,tsx}', 'src/media/*/{hls-js,spf}.tsx', i18nLocaleEntries],
  deps: {
    alwaysBundle: [/^@videojs\/skins/],
  },
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
      'check:public-types': {
        // Compiles a strict consumer (`skipLibCheck: false`) against the emitted declarations through the package
        // `exports` map. The source typecheck cannot see what the dts pipeline emits, so this is the only place a
        // consumer-facing declaration error surfaces before publish.
        command: 'tsgo --project tests/public-types/tsconfig.json',
        dependsOn: ['build'],
      },
      'test:ci': packageTestTask(),
    },
  },
  define: {
    __DEV__: 'true',
  },
  resolve: {
    // These tests run in a simulated browser, but Vitest transforms through the SSR pipeline, where `browser`
    // is not a resolve condition. Without it a dependency that answers `browser` separately — `@videojs/media`
    // does, for the medias whose engine has a server build — hands its server stand-in to a jsdom suite.
    conditions: ['browser', 'development', 'module', 'import', 'default'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  pack: packageBuildModes.map(createPackConfig),
});
