import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { normalizePath } from 'vite';
import { defineConfig } from 'vite-plus';
import { vjscPlugin } from 'vjsc/vite';

import { iconElementSourcePlugin } from '../../../icons/vjsc/vite.ts';
import { skinMetaDefaults } from '../config.ts';
import { resolveSkinComponents, resolveSkinStyles } from '../transform.ts';

const packageDir = resolve(import.meta.dirname, '../..');
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlDefineDir = normalizePath(resolve(packageDir, '../html/src/define'));
const htmlIconDir = normalizePath(resolve(packageDir, '../html/src/icons'));
const htmlIconElementDir = normalizePath(resolve(packageDir, '../html/src/icons/element'));

/**
 * Dev server the Vite workflow tests boot. It carries the compiler pipeline the skins playground ran before the
 * playground moved into the sandbox, rooted one level below the package so `/../src` URLs reach the authored sources.
 */
export default defineConfig({
  root: resolve(packageDir, 'build'),
  define: {
    __DEV__: 'true',
  },
  plugins: [
    iconElementSourcePlugin(),
    vjscPlugin({
      transform: {
        components: resolveSkinComponents,
        styles: resolveSkinStyles,
      },
      candidates: true,
      meta: { defaults: skinMetaDefaults },
    }),
    tailwindcss(),
    react({ jsxImportSource: 'react' }),
  ],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${reactSourceDir}/` },
      { find: /^@videojs\/react(?=\/|$)/, replacement: reactSourceDir },
      { find: /^@videojs\/html\/icons\/element(?=\/|$)/, replacement: htmlIconElementDir },
      { find: /^@videojs\/html\/icons(?=\/|$)/, replacement: htmlIconDir },
      { find: /^@videojs\/html(?=\/|$)/, replacement: htmlDefineDir },
    ],
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    dedupe: ['react', 'react-dom'],
  },
});
