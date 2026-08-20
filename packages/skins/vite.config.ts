import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { resolveCatalogCompilerConfig } from 'vjsc/catalog';
import { plugin as stylesPlugin } from 'vjsc/styles';
import compiler from 'vjsc/vite';

import { reactOutput } from './build/output/react';

const packageDir = import.meta.dirname;

const canonicalDir = normalizePath(resolve(packageDir, 'canonical'));

const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));

const output = resolveCatalogCompilerConfig(reactOutput());

export default defineConfig({
  root: resolve(packageDir, 'dev'),
  plugins: [
    compiler({
      include: `${canonicalDir}/**/*.tsx`,
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
    react(),
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
