import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath, type Plugin } from 'vite';

const htmlCdnDir = resolve(__dirname, '../../packages/html/cdn');
const htmlCdnI18nRegistry = normalizePath(resolve(htmlCdnDir, 'i18n.dev.js'));
const cdnSandboxMainSrc = resolve(__dirname, 'src/cdn/main.ts');
const cdnSandboxMainTemplate = resolve(__dirname, 'templates/cdn/main.ts');
const htmlSourceI18nStub = '\0sandbox-cdn-html-i18n-stub';
const jsdelivrCdnI18nPattern = /https:\/\/cdn\.jsdelivr\.net\/npm\/@videojs\/html@[^"']+\/cdn\/i18n\.js/g;

/** True when this import should share the single CDN i18n registry module instance. */
function resolvesToCdnI18nRegistry(source: string, importer?: string): boolean {
  if (
    source === '@videojs/html/cdn/i18n' ||
    source === htmlCdnI18nRegistry ||
    source.endsWith('/packages/html/cdn/i18n.dev.js') ||
    source.endsWith('/packages/html/src/cdn/i18n.ts')
  ) {
    return true;
  }

  const isRelativeI18nChunk =
    source === './i18n.dev.js' || source === '../i18n.dev.js' || source.endsWith('/i18n.dev.js');
  if (isRelativeI18nChunk && importer?.includes('/packages/html/cdn/')) {
    return true;
  }

  if (source === '@videojs/core/i18n' && importer?.includes('/packages/html/cdn/')) {
    return true;
  }

  return false;
}

function isCdnSandboxModule(id: string): boolean {
  return (
    id.includes('/apps/sandbox/src/cdn/') ||
    id.includes('/apps/sandbox/templates/cdn/') ||
    id.includes('/apps/sandbox/app/shared/i18n/cdn-')
  );
}

function resolveHtmlCdnDevEntry(subpath: string): string | null {
  const devPath = resolve(htmlCdnDir, `${subpath}.dev.js`);
  return existsSync(devPath) ? devPath : null;
}

/** CDN sandbox must use the CDN registry only — never source `@videojs/html/i18n`. */
function cdnSandboxI18nPlugin(): Plugin {
  return {
    name: 'cdn-sandbox-i18n',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === cdnSandboxMainSrc && existsSync(cdnSandboxMainTemplate)) {
        return cdnSandboxMainTemplate;
      }

      if (resolvesToCdnI18nRegistry(source, importer)) {
        return htmlCdnI18nRegistry;
      }

      const cdnEntryMatch = source.match(/^@videojs\/html\/cdn\/(.+)$/);
      if (cdnEntryMatch && cdnEntryMatch[1] !== 'i18n') {
        const devEntry = resolveHtmlCdnDevEntry(cdnEntryMatch[1]);
        if (devEntry) return devEntry;
      }

      if (!importer || !isCdnSandboxModule(importer)) {
        return null;
      }

      if (
        source === '@videojs/html/i18n' ||
        source.startsWith('@videojs/html/i18n/') ||
        source.includes('/packages/html/dist/dev/i18n/')
      ) {
        return htmlSourceI18nStub;
      }

      return null;
    },
    load(id) {
      if (id === htmlSourceI18nStub) {
        return 'export function registerI18n() {}';
      }
      return null;
    },
    transform(code, id) {
      if (!id.includes('/packages/html/cdn/') || !code.includes('cdn.jsdelivr.net/npm/@videojs/html')) {
        return null;
      }

      return {
        code: code.replace(jsdelivrCdnI18nPattern, htmlCdnI18nRegistry),
        map: null,
      };
    },
  };
}

/** Keep gitignored `src/` aligned with `templates/` so CDN i18n markup is never stale. */
function sandboxTemplateSyncPlugin(): Plugin {
  return {
    name: 'sandbox-template-sync',
    async buildStart() {
      const { mirrorTemplatesToSrc } = await import(pathToFileURL(resolve(__dirname, 'scripts/shared.ts')).href);
      await mirrorTemplatesToSrc();
    },
  };
}

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

function serveAppShell(): Plugin {
  const shellSrc = resolve(__dirname, 'app/index.html');
  const shellEntry = normalizePath(resolve(__dirname, 'app/main.tsx'));
  const shellDest = resolve(__dirname, 'src/index.html');

  return {
    name: 'serve-app-shell',
    buildStart() {
      const html = readFileSync(shellSrc, 'utf-8').replace(/(src|href)="\.\/([^"]+)"/g, '$1="../app/$2"');
      writeFileSync(shellDest, html);
    },
    closeBundle() {
      rmSync(shellDest, { force: true });
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.originalUrl ?? req.url ?? '/';
        const { pathname } = new URL(requestUrl, 'http://localhost');

        if (pathname === '/' || pathname === '/index.html') {
          const html = readFileSync(shellSrc, 'utf-8').replace('./main.tsx', `/@fs/${shellEntry}`);
          const transformed = await server.transformIndexHtml('/app/index.html', html, requestUrl);

          res.setHeader('Content-Type', 'text/html');
          res.end(transformed);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  root: 'src',
  appType: 'mpa',
  plugins: [sandboxTemplateSyncPlugin(), cdnSandboxI18nPlugin(), tailwindcss(), react(), serveAppShell()],
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'app'),
      '@videojs/html/cdn/i18n': htmlCdnI18nRegistry,
      ...(existsSync(cdnSandboxMainTemplate) ? { [cdnSandboxMainSrc]: cdnSandboxMainTemplate } : {}),
    },
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
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
      onwarn(warning, defaultHandler) {
        if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') return;
        defaultHandler(warning);
      },
    },
  },
});
