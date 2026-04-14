import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function getPageEntries(): Record<string, string> {
  const srcDir = resolve(__dirname, 'src');
  const entries: Record<string, string> = {};

  for (const entry of readdirSync(srcDir)) {
    const htmlFile = resolve(srcDir, entry);

    if (entry.endsWith('.html') && entry !== 'index.html' && statSync(htmlFile).isFile()) {
      const name = entry.replace('.html', '');
      entries[name] = htmlFile;
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
