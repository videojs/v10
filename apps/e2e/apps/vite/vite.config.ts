import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { vjscPlugin } from 'vjsc/vite';

import { configureSkinModule } from '../../../../packages/skins/vjsc/config.ts';

const packageDir = import.meta.dirname;

function getPageEntries(): Record<string, string> {
  const entries: Record<string, string> = {};

  // Hand-written pages in src/ (ejected, captions, etc.)
  const srcDir = resolve(packageDir, 'src');

  for (const entry of readdirSync(srcDir)) {
    const file = resolve(srcDir, entry);

    if (entry.endsWith('.html') && entry !== 'index.html' && statSync(file).isFile()) {
      entries[entry.replace('.html', '')] = file;
    }
  }

  // Generated pages in src/pages/
  const pagesDir = resolve(packageDir, 'src/pages');

  if (existsSync(pagesDir)) {
    for (const entry of readdirSync(pagesDir)) {
      const file = resolve(pagesDir, entry);

      if (entry.endsWith('.html') && statSync(file).isFile()) {
        entries[`pages/${entry.replace('.html', '')}`] = file;
      }
    }
  }

  return entries;
}

export default defineConfig({
  root: 'src',
  appType: 'mpa',
  define: {
    __DEV__: 'true',
  },
  plugins: [vjscPlugin({ configure: configureSkinModule }), react({ jsxImportSource: 'react' })],
  resolve: {
    dedupe: ['@videojs/html', '@videojs/react', 'react', 'react-dom', 'vjsc'],
  },
  optimizeDeps: {
    exclude: [
      '@videojs/core',
      '@videojs/html',
      '@videojs/icons',
      '@videojs/react',
      '@videojs/spf',
      '@videojs/store',
      '@videojs/utils',
      'vjsc',
      'vjsc/styles',
    ],
  },
  build: {
    outDir: resolve(packageDir, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    rolldownOptions: {
      experimental: {
        nativeMagicString: true,
      },
      input: {
        main: resolve(packageDir, 'src/index.html'),
        ...getPageEntries(),
      },
    },
  },
});
