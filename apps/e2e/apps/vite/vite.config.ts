import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function getPageEntries(): Record<string, string> {
  const entries: Record<string, string> = {};

  // Hand-written pages in src/ (ejected, captions, etc.)
  const srcDir = resolve(__dirname, 'src');
  for (const entry of readdirSync(srcDir)) {
    const file = resolve(srcDir, entry);
    if (entry.endsWith('.html') && entry !== 'index.html' && statSync(file).isFile()) {
      entries[entry.replace('.html', '')] = file;
    }
  }

  // Generated pages in src/pages/
  const pagesDir = resolve(__dirname, 'src/pages');
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
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
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
    ],
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        ...getPageEntries(),
      },
    },
  },
});
