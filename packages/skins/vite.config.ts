import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { vjscPlugin } from 'vjsc/vite';
import { iconElementSourcePlugin } from '../icons/vjsc/vite';
import { configureSkinModule } from './vjsc/config';

const packageDir = import.meta.dirname;
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlDefineDir = normalizePath(resolve(packageDir, '../html/src/define'));
const htmlIconElementDir = normalizePath(resolve(packageDir, '../html/src/icons/element'));

export default defineConfig(createPreviewConfig());

function createPreviewConfig() {
  return {
    root: resolve(packageDir, 'dev'),
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
    build: {
      sourcemap: true,
      rolldownOptions: {
        experimental: {
          nativeMagicString: true,
        },
      },
    },
  };
}
