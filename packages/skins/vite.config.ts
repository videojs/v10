import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { vjscPlugin } from 'vjsc/bundle';
import { createSkinVjscPlugin } from './vjsc/plugin';
import { createSkinShadcnOutput } from './vjsc/registry/shadcn';

const packageDir = import.meta.dirname;
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlSourceDir = normalizePath(resolve(packageDir, '../html/src'));

export default defineConfig(({ mode }) => (mode === 'registry' ? createRegistryConfig() : createPreviewConfig()));

function createRegistryConfig() {
  const registry = createSkinShadcnOutput();

  return {
    root: packageDir,
    plugins: [vjscPlugin({ outputs: [registry] })],
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
  return {
    root: resolve(packageDir, 'dev'),
    define: {
      __DEV__: 'true',
    },
    plugins: [createSkinVjscPlugin(), tailwindcss(), react({ jsxImportSource: 'react' })],
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
