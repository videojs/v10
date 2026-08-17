import { resolve } from 'node:path';

import compiler from '@videojs/compiler/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';

import { createCompilerReactConfig } from './build/transform/react';

const packageDir = import.meta.dirname;

const canonicalDir = normalizePath(resolve(packageDir, 'canonical'));

const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));

export default defineConfig({
  root: resolve(packageDir, 'dev'),
  plugins: [
    compiler({
      include: `${canonicalDir}/**/*.tsx`,
      config: createCompilerReactConfig({
        rootClassName: 'media-skin media-skin-video media-theme-default',
        styles: {
          mode: 'css',
          variant: 'default',
          emit: {
            input: resolve(canonicalDir, 'styles/tailwind.css'),
            scope: '.media-skin-video',
          },
        },
      }),
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
    exclude: [
      '@videojs/compiler',
      '@videojs/compiler/styles',
      '@videojs/core',
      '@videojs/icons',
      '@videojs/react',
      '@videojs/utils',
    ],
  },
});
