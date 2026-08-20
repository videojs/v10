import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { jsx, syncGeneratedModuleTypes } from 'vjsc';
import type { ImportRef } from 'vjsc/ast';
import { catalogMetaPlugin } from 'vjsc/catalog';
import { plugin as registryPlugin } from 'vjsc/registry';
import { plugin as stylesPlugin } from 'vjsc/styles';
import compiler from 'vjsc/vite';
import { createIconElementModule } from './build/icon-element';
import {
  coreSchemaModule,
  createReactComponentRegistry,
  getIconSchemaModule,
  htmlEntriesModule,
  reactEntriesModule,
} from './build/metadata';
import { componentTransforms } from './build/output/react/transform';
import { createSkinVirtualModules } from './build/virtual-skins';
import { createSkinCatalogItemsModule } from './canonical/catalog';

const packageDir = import.meta.dirname;
const canonicalDir = normalizePath(resolve(packageDir, 'canonical'));
const coreDir = resolve(packageDir, '../core');
const iconsDir = resolve(packageDir, '../icons');
const reactDir = resolve(packageDir, '../react');
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlSourceDir = normalizePath(resolve(packageDir, '../html/src'));

const iconSchemaModule = getIconSchemaModule();
const defaultIconElementModule = createIconElementModule('default');
const minimalIconElementModule = createIconElementModule('minimal');
const catalogModule = createSkinCatalogItemsModule();

await Promise.all([
  syncGeneratedModuleTypes({
    rootDir: coreDir,
    modules: [{ fileName: resolve(coreDir, '.vjsc/virtual/core-schema.ts'), module: coreSchemaModule }],
  }),
  syncGeneratedModuleTypes({
    rootDir: packageDir,
    modules: [{ fileName: resolve(packageDir, 'canonical/catalog.generated.ts'), module: catalogModule }],
  }),
  syncGeneratedModuleTypes({
    rootDir: reactDir,
    modules: [{ fileName: resolve(reactDir, 'vjsc/entries.generated.ts'), module: reactEntriesModule }],
  }),
  syncGeneratedModuleTypes({
    rootDir: resolve(packageDir, '../html'),
    modules: [
      {
        fileName: resolve(packageDir, '../html/vjsc/entries.generated.ts'),
        module: htmlEntriesModule,
      },
    ],
  }),
  syncGeneratedModuleTypes({
    rootDir: iconsDir,
    modules: [{ fileName: resolve(iconsDir, 'vjsc/schema.generated.ts'), module: iconSchemaModule }],
  }),
]);

const componentRegistry = createReactComponentRegistry();

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
  plugins: [catalogMetaPlugin(), registryPlugin(componentRegistry), componentTransforms(resolveImport)],
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
        { id: 'virtual:vjsc/core-schema', load: () => coreSchemaModule },
        { id: 'virtual:vjsc/icons-schema', load: () => iconSchemaModule },
        { id: 'virtual:vjsc/registry/react', load: () => reactEntriesModule },
        { id: 'virtual:vjsc/registry/html', load: () => htmlEntriesModule },
        { id: 'virtual:vjsc/catalog', load: createSkinCatalogItemsModule },
        { id: 'virtual:vjsc/icons/element/default.js', load: () => defaultIconElementModule },
        { id: 'virtual:vjsc/icons/element/minimal.js', load: () => minimalIconElementModule },
        ...createSkinVirtualModules(),
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
    tailwindcss(),
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
        find: /^@videojs\/react\/icons\/(.+)$/,
        replacement: `${reactSourceDir}/icons/$1/index.ts`,
      },
      {
        find: /^@videojs\/react\/video$/,
        replacement: resolve(reactSourceDir, 'presets/video/index.ts'),
      },
      { find: /^@\//, replacement: `${reactSourceDir}/` },
      { find: /^@videojs\/html\/i18n$/, replacement: resolve(htmlSourceDir, 'define/i18n.ts') },
      {
        find: /^@videojs\/html\/ui\/(.+)$/,
        replacement: `${htmlSourceDir}/define/ui/$1.ts`,
      },
      {
        find: /^@videojs\/html\/media\/(.+)$/,
        replacement: `${htmlSourceDir}/define/media/$1.ts`,
      },
      {
        find: /^@videojs\/html\/icons\/element$/,
        replacement: resolve(htmlSourceDir, 'icons/element/index.ts'),
      },
      {
        find: /^@videojs\/html\/icons\/element\/(.+)$/,
        replacement: `${htmlSourceDir}/icons/element/$1/index.ts`,
      },
      {
        find: /^@videojs\/icons\/element$/,
        replacement: 'virtual:vjsc/icons/element/default.js',
      },
      {
        find: /^@videojs\/icons\/element\/(.+)$/,
        replacement: 'virtual:vjsc/icons/element/$1.js',
      },
    ],
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['vjsc', 'vjsc/styles', '@videojs/core', '@videojs/icons', '@videojs/react', '@videojs/utils'],
  },
});
