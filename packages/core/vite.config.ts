import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { cachedTaskInputs } from '../../build/run.ts';
// Vite+ loads configs before it can build workspace dependencies.
import { componentSchemaPlugin } from '../vjsc/src/plugins/index.ts';
import { LOCALES, localeAliases } from './src/core/i18n/locales.ts';
import en from './src/core/i18n/locales/en.ts';

const localeTags = [...LOCALES, ...localeAliases(LOCALES)];
const textNamespaces = [...new Set(Object.keys(en).map((key) => key.split('.')[0]))];

const localeEntries = Object.fromEntries([
  ['i18n/locales/all', './src/core/i18n/locales/all.ts'],
  ['i18n/locales/en', './src/core/i18n/locales/en.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `./src/core/i18n/locales/${tag}.ts`]),
  ...textNamespaces.map((namespace) => [`i18n/text/${namespace}`, `./src/core/i18n/text/${namespace}.ts`]),
]);

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  dts:
    mode === 'dev'
      ? {
          tsgo: true,
          tsconfig: 'tsconfig.dts.json',
          entry: ['src/**/*.ts'],
        }
      : false,
  deps: { neverBundle: ['vjsc/components'] },
  plugins: [
    componentSchemaPlugin({
      file: 'vjsc',
      declaration: mode === 'dev',
      source: '@videojs/core/vjsc',
      include: ['./src/core/ui/*/*-component.ts'],
    }),
  ],
  entry: {
    index: './src/core/index.ts',
    i18n: './src/core/i18n/index.ts',
    ...localeEntries,
    dom: './src/dom/index.ts',
  },
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
});

export default defineConfig({
  run: {
    tasks: {
      build: {
        command:
          'node --import tsx ./scripts/generate-i18n-locales.ts && node --import tsx ./scripts/generate-i18n-types.ts && vp pack',
        dependsOn: [{ task: 'build', from: ['dependencies', 'devDependencies'] }],
        // The CDN task consumes Core, but its generated output is not an input
        // to Core's locale generators or package build.
        input: [
          ...cachedTaskInputs,
          { pattern: '!packages/cli/docs', base: 'workspace' },
          { pattern: '!packages/cli/docs/**', base: 'workspace' },
          { pattern: '!packages/html/cdn', base: 'workspace' },
          { pattern: '!packages/html/cdn/**', base: 'workspace' },
        ],
      },
    },
  },
  define: {
    __DEV__: 'true',
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          include: ['src/core/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'core/dom',
          include: ['src/dom/**/*.test.ts'],
          environment: 'jsdom',
          setupFiles: ['src/dom/tests/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'core/scripts',
          include: ['scripts/**/*.test.ts'],
        },
      },
    ],
  },
  pack: packageBuildModes.map(createPackConfig),
});
