import { resolve } from 'node:path';

import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { writeGeneratedFile } from 'vjsc/generate';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import en from './src/core/i18n/locales/en.ts';
import { LOCALES, localeAliases } from './src/core/i18n/locales.ts';
import { createCoreSchemaModule } from './vjsc.ts';

const localeTags = [...LOCALES, ...localeAliases(LOCALES)];
const textNamespaces = [...new Set(Object.keys(en).map((key) => key.split('.')[0]))];

const localeEntries = Object.fromEntries([
  ['i18n/locales/all', './src/core/i18n/locales/all.ts'],
  ['i18n/locales/en', './src/core/i18n/locales/en.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `./src/core/i18n/locales/${tag}.ts`]),
  ...textNamespaces.map((namespace) => [`i18n/text/${namespace}`, `./src/core/i18n/text/${namespace}.ts`]),
]);

const schemaFile = resolve(import.meta.dirname, '.vjsc/virtual/core-schema.ts');
writeGeneratedFile(schemaFile, createCoreSchemaModule(schemaFile).code);

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  deps: { neverBundle: ['vjsc/components'] },
  entry: {
    index: './src/core/index.ts',
    vjsc: schemaFile,
    i18n: './src/core/i18n/index.ts',
    ...localeEntries,
    dom: './src/dom/index.ts',
  },
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
