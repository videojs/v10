import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { normalizePath } from 'vite';
import { defineConfig } from 'vite-plus';

import { iconElementSourcePlugin } from '../../icons/vjsc/vite.ts';
import { vjscPlugin } from '../../vjsc/src/vite/index.ts';
import { configureSkinModule } from '../vjsc/config.ts';

const packageDir = resolve(import.meta.dirname, '..');
const skinSourceDir = normalizePath(resolve(packageDir, 'src'));
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlDefineDir = normalizePath(resolve(packageDir, '../html/src/define'));
const htmlIconElementDir = normalizePath(resolve(packageDir, '../html/src/icons/element'));

export default defineConfig({
  root: import.meta.dirname,
  define: {
    __DEV__: 'true',
  },
  plugins: [
    iconElementSourcePlugin(),
    vjscPlugin({
      configure: configureSkinModule,
    }),
    tailwindcss(),
    react({ jsxImportSource: 'react' }),
  ],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${reactSourceDir}/` },
      { find: /^@videojs\/skins(?=\/|$)/, replacement: skinSourceDir },
      { find: /^@videojs\/react(?=\/|$)/, replacement: reactSourceDir },
      { find: /^@videojs\/html\/icons\/element(?=\/|$)/, replacement: htmlIconElementDir },
      { find: /^@videojs\/html(?=\/|$)/, replacement: htmlDefineDir },
    ],
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['vjsc', 'vjsc/styles', '@videojs/core', '@videojs/icons', '@videojs/react', '@videojs/utils'],
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    rolldownOptions: {
      experimental: {
        nativeMagicString: true,
      },
    },
  },
});
