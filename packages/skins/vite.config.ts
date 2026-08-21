import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { iconElementPlugin } from '@videojs/icons/rolldown';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { vjscPlugin } from 'vjsc/vite';
import { configureSkinModule } from './vjsc/config';

const packageDir = import.meta.dirname;
const vjscDir = normalizePath(resolve(packageDir, 'vjsc'));
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlSourceDir = normalizePath(resolve(packageDir, '../html/src'));

export default defineConfig(createPreviewConfig());

function createPreviewConfig() {
  return {
    root: resolve(packageDir, 'dev'),
    define: {
      __DEV__: 'true',
    },
    plugins: [
      iconElementPlugin(),
      vjscPlugin({ configure: configureSkinModule }),
      tailwindcss(),
      react({ jsxImportSource: 'react' }),
    ],
    resolve: {
      alias: [
        {
          find: /^virtual:vjsc\/skin\/(react|html)\/([^/]+)\/(vanilla|tailwind)\.tsx$/,
          replacement: `${vjscDir}/skins/$2/skin.tsx?target=$1&skin=$2&style=$3`,
        },
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
