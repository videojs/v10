import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { jsx } from 'vjsc';
import { vjscPlugin } from 'vjsc/bundle';
import { catalogMetaPlugin } from 'vjsc/catalog';
import { plugin as registryPlugin } from 'vjsc/registry';
import { shadcnPlugin } from 'vjsc/shadcn';
import { plugin as stylesPlugin } from 'vjsc/styles';
import { createIconElementModule } from './build/icon-element';
import { createReactComponentRegistry } from './build/metadata';
import { reactOutput } from './build/output/react';
import { componentTransforms } from './build/output/react/transform';
import { createSkinVirtualModules } from './build/virtual-skins';
import { formatGeneratedFile } from './scripts/generation/format';
import skinCatalog from './vjsc/catalog';
import skinRegistry from './vjsc/registry/shadcn';

const packageDir = import.meta.dirname;
const vjscDir = normalizePath(resolve(packageDir, 'vjsc'));
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlSourceDir = normalizePath(resolve(packageDir, '../html/src'));

export default defineConfig(({ mode }) => (mode === 'registry' ? createRegistryConfig() : createPreviewConfig()));

function createRegistryConfig() {
  const registry = shadcnPlugin({
    catalog: skinCatalog,
    rootDir: vjscDir,
    registry: skinRegistry,
    output: reactOutput(),
    styles: {
      mode: 'tailwind',
      variant: 'default',
    },
    format: formatGeneratedFile,
  });

  return {
    root: packageDir,
    plugins: [registry],
    build: {
      outDir: resolve(packageDir, 'dist/registry'),
      emptyOutDir: true,
      rolldownOptions: {
        input: registry.moduleId,
      },
    },
  };
}

function createPreviewConfig() {
  const defaultIconElementModule = createIconElementModule('default');
  const minimalIconElementModule = createIconElementModule('minimal');
  const componentRegistry = createReactComponentRegistry();
  const output = {
    target: jsx({
      importSource: 'react',
    }),
    plugins: [catalogMetaPlugin(), registryPlugin(componentRegistry), componentTransforms()],
  };

  return {
    root: resolve(packageDir, 'dev'),
    define: {
      __DEV__: 'true',
    },
    plugins: [
      vjscPlugin({
        cwd: packageDir,
        include: `${vjscDir}/**/*.tsx`,
        modules: [
          { id: 'virtual:vjsc/icons/element/default.js' as const, load: () => defaultIconElementModule },
          { id: 'virtual:vjsc/icons/element/minimal.js' as const, load: () => minimalIconElementModule },
          ...createSkinVirtualModules(skinCatalog),
        ],
        config: {
          ...output,
          plugins: [
            stylesPlugin({
              mode: 'css',
              variant: 'default',
              emit: {
                input: resolve(vjscDir, 'styles/tailwind.css'),
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
  };
}
