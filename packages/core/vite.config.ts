import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';
import type {
  ComponentSchemaPluginOptions,
  componentSchemaPlugin as createComponentSchemaPlugin,
} from '../vjsc/src/plugins/component-schema.ts';
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
        dependsOn: workspaceTaskDependencies(),
        // The CDN task consumes Core, but its generated output is not an input
        // to Core's locale generators or package build.
        input: [
          ...cachedTaskInputs,
          { pattern: '!packages/cli/docs', base: 'workspace' },
          { pattern: '!packages/cli/docs/**', base: 'workspace' },
          { pattern: '!packages/html/cdn', base: 'workspace' },
          { pattern: '!packages/html/cdn/**', base: 'workspace' },
        ],
        output: [
          'dist/**',
          'src/core/i18n/load-locale.ts',
          'src/core/i18n/locales/all.ts',
          'src/core/i18n/params.generated.ts',
          'src/core/i18n/text/**',
          { pattern: 'packages/html/src/i18n/locales/**', base: 'workspace' },
          { pattern: 'packages/react/src/i18n/locales/**', base: 'workspace' },
        ],
      },
      'test:ci': packageTestTask('pnpm run test:types && vp test run'),
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

/** Load the private compiler after Vite+ has built Core's workspace dependencies. */
function componentSchemaPlugin(config: ComponentSchemaPluginOptions) {
  let plugin: ReturnType<typeof createComponentSchemaPlugin>;

  return {
    name: 'vjsc:deferred-component-schema',
    async options(options) {
      const module = await import('vjsc/plugins');

      plugin = module.componentSchemaPlugin(config);
      return plugin.options.call(this, options);
    },
    resolveId(id) {
      return plugin.resolveId.call(this, id);
    },
    load: {
      order: 'pre',
      handler(id) {
        return plugin.load.handler.call(this, id);
      },
    },
  } satisfies ReturnType<typeof createComponentSchemaPlugin>;
}
