import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { normalizePath } from 'vite';
import { defineConfig } from 'vite-plus';

import { iconElementSourcePlugin } from '../../icons/vjsc/vite.ts';
import { vjscPlugin } from '../../vjsc/src/vite/index.ts';
import { skinMetaDefaults } from '../build/config.ts';
import { resolveSkinComponents, resolveSkinStyles } from '../build/transform.ts';

const packageDir = resolve(import.meta.dirname, '..');

/** Branch and commit for the copied preview report; falls back when the checkout has no git metadata. */
function describeGit(...args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: packageDir, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}
const reactSourceDir = normalizePath(resolve(packageDir, '../react/src'));
const htmlDefineDir = normalizePath(resolve(packageDir, '../html/src/define'));
const htmlIconDir = normalizePath(resolve(packageDir, '../html/src/icons'));
const htmlIconElementDir = normalizePath(resolve(packageDir, '../html/src/icons/element'));

export default defineConfig({
  root: import.meta.dirname,
  define: {
    __DEV__: 'true',
    __PREVIEW_BRANCH__: JSON.stringify(describeGit('rev-parse', '--abbrev-ref', 'HEAD')),
    __PREVIEW_COMMIT__: JSON.stringify(describeGit('rev-parse', '--short', 'HEAD')),
  },
  plugins: [
    iconElementSourcePlugin(),
    vjscPlugin({
      transform: {
        components: resolveSkinComponents,
        styles: resolveSkinStyles,
      },
      meta: { defaults: skinMetaDefaults },
      candidates: true,
    }),
    tailwindcss(),
    // The entry mounts the preview with top-level awaits and must never hot swap. Without a refresh boundary, updates
    // that reach it, such as rebuilt workspace dist files or context modules, fall through to a full reload.
    react({ jsxImportSource: 'react', exclude: [/\/dev\/main\.tsx$/] }),
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
  optimizeDeps: {
    // The preview imports every media adapter up front. Prebundle their runtime dependencies before serving so Vite
    // does not hot-update the mounted player graph as each adapter is discovered.
    include: [
      '@lit/context',
      'dashjs',
      'hls.js',
      'mux-embed',
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
    ],
    exclude: ['vjsc', 'vjsc/styles', '@videojs/core', '@videojs/icons', '@videojs/react', '@videojs/utils'],
    noDiscovery: true,
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
