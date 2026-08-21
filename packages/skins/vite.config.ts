import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { iconElementPlugin } from '@videojs/icons/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { vjscPlugin } from 'vjsc/vite';
import { createSkinTransformer } from './vjsc/transform';

const packageDir = import.meta.dirname;
const vjscDir = normalizePath(resolve(packageDir, 'vjsc'));
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlSourceDir = normalizePath(resolve(packageDir, '../html/src'));

const vjscInclude = new RegExp(`^${escapeRegExp(vjscDir)}/.*\\.tsx(?:\\?.*)?$`);

export default defineConfig(createPreviewConfig());

function createPreviewConfig() {
  const transform = createSkinTransformer();

  return {
    root: resolve(packageDir, 'dev'),
    define: {
      __DEV__: 'true',
    },
    plugins: [
      iconElementPlugin(),
      vjscPlugin({
        cwd: packageDir,
        include: vjscInclude,
        isVjscModule: ({ parameters }) => parameters.has('framework'),
        transform,
      }),
      tailwindcss(),
      react({ jsxImportSource: 'react' }),
    ],
    resolve: {
      alias: [
        {
          find: /^virtual:vjsc\/skin\/(react|html)\/([^/]+)\/(vanilla|tailwind)\.tsx$/,
          replacement: `${vjscDir}/skins/$2/skin.tsx?framework=$1&skin=$2&style=$3`,
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
