import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath, type Plugin } from 'vite';

/** Discover sandbox entries by finding subdirectories of src/ that contain an index.html. */
function getSandboxEntries(): Record<string, string> {
  const srcDir = resolve(__dirname, 'src');
  const entries: Record<string, string> = {};

  for (const entry of readdirSync(srcDir)) {
    const dir = resolve(srcDir, entry);
    const indexHtml = resolve(dir, 'index.html');

    if (statSync(dir).isDirectory() && existsSync(indexHtml)) {
      entries[entry] = indexHtml;
    }
  }

  return entries;
}

/**
 * Serve app/index.html as the shell entry.
 * - Dev: middleware intercepts `/` and serves the shell HTML.
 * - Build: temporarily copies to `src/index.html` so Rollup can find it within root.
 */
function serveAppShell(): Plugin {
  const shellSrc = resolve(__dirname, 'app/index.html');
  const shellEntry = normalizePath(resolve(__dirname, 'app/main.tsx'));
  const shellDest = resolve(__dirname, 'src/index.html');

  return {
    name: 'serve-app-shell',
    buildStart() {
      // Rewrite relative paths to point to app/ since the copy lives in src/
      const html = readFileSync(shellSrc, 'utf-8').replace(/(src|href)="\.\/([^"]+)"/g, '$1="../app/$2"');
      writeFileSync(shellDest, html);
    },
    closeBundle() {
      rmSync(shellDest, { force: true });
    },
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            const html = readFileSync(shellSrc, 'utf-8').replace('./main.tsx', `/@fs/${shellEntry}`);
            const transformed = await server.transformIndexHtml('/app/index.html', html, req.originalUrl);
            res.setHeader('Content-Type', 'text/html');
            res.end(transformed);
            return;
          }

          next();
        });
      };
    },
  };
}

export default defineConfig({
  root: 'src',
  appType: 'mpa',
  plugins: [tailwindcss(), react(), serveAppShell()],
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'app'),
    },
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
        ...getSandboxEntries(),
      },
    },
  },
});
