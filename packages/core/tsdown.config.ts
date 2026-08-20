import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import compiler from 'vjsc/rolldown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';
import en from './src/core/i18n/locales/en.ts';
import { LOCALES, localeAliases } from './src/core/i18n/locales.ts';
import { coreSchemaModule } from './src/vjsc.config.ts';

const localeTags = [...LOCALES, ...localeAliases(LOCALES)];
const textNamespaces = [...new Set(Object.keys(en).map((key) => key.split('.')[0]))];

const localeEntries = Object.fromEntries([
  ['i18n/locales/all', './src/core/i18n/locales/all.ts'],
  ['i18n/locales/en', './src/core/i18n/locales/en.ts'],
  ...localeTags.map((tag) => [`i18n/locales/${tag}`, `./src/core/i18n/locales/${tag}.ts`]),
  ...textNamespaces.map((namespace) => [`i18n/text/${namespace}`, `./src/core/i18n/text/${namespace}.ts`]),
]);

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  dts: mode === 'dev' ? { tsgo: true, tsconfig: 'tsconfig.dts.json', entry: ['src/**/*.ts'] } : false,
  deps: { neverBundle: ['vjsc/components'] },
  plugins: [
    compiler({
      modules: [coreSchemaModule],
      resolveId: () => coreSchemaModule.fileName,
      declarations:
        mode === 'dev'
          ? [
              {
                id: coreSchemaModule.id,
                sourceFileName: coreSchemaModule.fileName,
                fileName: 'vjsc.d.ts',
              },
            ]
          : [],
    }),
  ],
  entry: {
    index: './src/core/index.ts',
    vjsc: coreSchemaModule.id,
    i18n: './src/core/i18n/index.ts',
    ...localeEntries,
    dom: './src/dom/index.ts',
  },
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
