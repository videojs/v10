import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { componentSchemaPlugin } from 'vjsc/plugins';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import en from './src/core/i18n/locales/en.ts';
import { LOCALES, localeAliases } from './src/core/i18n/locales.ts';

const localeTags = [...LOCALES, ...localeAliases(LOCALES)];
const textNamespaces = [...new Set(Object.keys(en).map((key) => key.split('.')[0]))];

const localeEntries = Object.fromEntries([
  ['i18n/locales/all', './src/core/i18n/locales/all.ts'],
  ['i18n/locales/en', './src/core/i18n/locales/en.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `./src/core/i18n/locales/${tag}.ts`]),
  ...textNamespaces.map((namespace) => [`i18n/text/${namespace}`, `./src/core/i18n/text/${namespace}.ts`]),
]);

const createConfig = (mode: PackageBuildMode): UserConfig => {
  return {
    ...packageBuildConfig(mode, 'neutral'),
    dts:
      mode === 'dev'
        ? {
            tsgo: true,
            tsconfig: 'tsconfig.dts.json',
            entry: ['src/**/*.ts'],
          }
        : false,
    deps: {
      neverBundle: ['vjsc/components'],
    },
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
  };
};

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
