import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

import { createSkinsSourceConfig } from '../vite.ts';

const packageDir = resolve(import.meta.dirname, '../..');
const skins = createSkinsSourceConfig({ tailwind: true, frameworks: 'source' });

/**
 * Dev server the Vite workflow tests boot. It carries the compiler pipeline the skins playground ran before the
 * playground moved into the sandbox, rooted one level below the package so `/../src` URLs reach the authored sources.
 */
export default defineConfig({
  root: resolve(packageDir, 'build'),
  define: {
    __DEV__: 'true',
  },
  plugins: [...skins.plugins, tailwindcss(), react({ jsxImportSource: 'react' })],
  resolve: {
    ...skins.resolve,
    conditions: ['development', 'import', 'module', 'browser', 'default'],
  },
  optimizeDeps: skins.optimizeDeps,
});
