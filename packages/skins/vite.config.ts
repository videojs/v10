import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { createEntriesModule, createSchemaModule, jsx, syncGeneratedModuleTypes } from 'vjsc';
import type { ImportRef } from 'vjsc/ast';
import { defineRegistry, extendRegistry, plugin as registryPlugin } from 'vjsc/registry';
import { plugin as stylesPlugin } from 'vjsc/styles';
import compiler from 'vjsc/vite';

import { iconNames } from '../icons/scripts/internal/icon-names';
import { getSvgFiles } from '../icons/scripts/internal/paths';
import { createRegistry, type ReactRegistryEntries } from '../react/vjsc/registry';
import { resolveReactEntry } from '../react/vjsc/resolve';
import { componentTransforms } from './build/output/react/transform';

const packageDir = import.meta.dirname;
const canonicalDir = normalizePath(resolve(packageDir, 'canonical'));
const coreDir = resolve(packageDir, '../core');
const iconsDir = resolve(packageDir, '../icons');
const reactDir = resolve(packageDir, '../react');
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));

const coreSchema = createSchemaModule(
  {
    source: '@videojs/core/vjsc',
    files: ['./src/core/ui/*/*-component.ts'],
    output: './src/core/ui/schema.generated.ts',
  },
  { cwd: coreDir }
);

const reactEntries = createEntriesModule(
  {
    schema: coreSchema.schema,
    output: './vjsc/entries.generated.ts',
    resolve: resolveReactEntry,
  },
  { cwd: reactDir }
);

const iconFiles = getSvgFiles('default');
const iconSchema = createSchemaModule(
  {
    source: '@videojs/icons/vjsc',
    files: [
      {
        files: resolve(iconsDir, 'src/assets/default/*.svg'),
        name: (filename) => `${iconNames(filename).pascal}Icon`,
      },
    ],
    output: './vjsc/schema.generated.ts',
  },
  { cwd: iconsDir }
);

await Promise.all([
  syncGeneratedModuleTypes({
    rootDir: coreDir,
    modules: [{ fileName: resolve(coreDir, 'src/core/ui/schema.generated.ts'), module: coreSchema }],
  }),
  syncGeneratedModuleTypes({
    rootDir: reactDir,
    modules: [{ fileName: resolve(reactDir, 'vjsc/entries.generated.ts'), module: reactEntries }],
  }),
  syncGeneratedModuleTypes({
    rootDir: iconsDir,
    modules: [{ fileName: resolve(iconsDir, 'vjsc/schema.generated.ts'), module: iconSchema }],
  }),
]);

const iconEntries = Object.fromEntries(
  iconFiles.map((file) => {
    const name = file.slice(0, -'.svg'.length);
    const component = `${iconNames(name).pascal}Icon`;
    return [
      component,
      {
        import: { from: '@videojs/react/icons', name: component },
        props: { from: '@videojs/react/icons', name: 'IconProps' },
      },
    ];
  })
);

const componentRegistry = extendRegistry(
  createRegistry(coreSchema.schema, reactEntries.exports as ReactRegistryEntries),
  defineRegistry({ schema: iconSchema.schema, entries: iconEntries })
);

const resolveImport = (reference: ImportRef): ImportRef => reference;
const output = {
  target: jsx({
    jsxImportSource: 'react',
    imports: {
      '@videojs/core': (name) => resolveImport({ source: '@videojs/core', name }),
      '@videojs/react': (name) => resolveImport({ source: '@videojs/react', name }),
      '@videojs/utils/style': (name) => resolveImport({ source: '@videojs/utils/style', name }),
      '@videojs/react/icons': (name) => resolveImport({ source: '@videojs/react/icons', name }),
      react: (name) => resolveImport({ source: 'react', name }),
    },
  }),
  plugins: [registryPlugin(componentRegistry), componentTransforms(resolveImport)],
};

export default defineConfig({
  root: resolve(packageDir, 'dev'),
  define: {
    __DEV__: 'true',
  },
  plugins: [
    compiler({
      include: `${canonicalDir}/**/*.tsx`,
      modules: [
        { id: 'virtual:vjsc/core-schema', load: () => coreSchema },
        { id: 'virtual:vjsc/icons-schema', load: () => iconSchema },
        { id: 'virtual:vjsc/registry/react', load: () => reactEntries },
      ],
      config: {
        ...output,
        plugins: [
          stylesPlugin({
            mode: 'css',
            variant: 'default',
            emit: {
              input: resolve(canonicalDir, 'styles/tailwind.css'),
              scope: '.media-skin-video',
            },
          }),
          ...(output.plugins ?? []),
        ],
      },
    }),
    react({ jsxImportSource: 'react' }),
  ],
  resolve: {
    alias: [
      { find: /^@videojs\/react$/, replacement: resolve(reactSourceDir, 'index.ts') },
      {
        find: /^@videojs\/react\/icons$/,
        replacement: resolve(reactSourceDir, 'icons/index.ts'),
      },
      {
        find: /^@videojs\/react\/video$/,
        replacement: resolve(reactSourceDir, 'presets/video/index.ts'),
      },
      { find: /^@\//, replacement: `${reactSourceDir}/` },
    ],
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['vjsc', 'vjsc/styles', '@videojs/core', '@videojs/icons', '@videojs/react', '@videojs/utils'],
  },
});
