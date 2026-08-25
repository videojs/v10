import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath, type Plugin } from 'vite-plus';

import { cachedTaskInputs, cachedTaskOutputs, workspaceTaskDependencies } from '../../build/task.ts';
import { mirrorTemplatesToSrc } from './scripts/shared';

// Locate @videojs/html through Node resolution rather than a workspace-relative
// path, so the sandbox also works when the package is installed from a registry.
// The manifest is the anchor because cdn/ only exists after `pnpm build:cdn`.
const htmlPackageDir = normalizePath(dirname(createRequire(__filename).resolve('@videojs/html/package.json')));
const htmlCdnDir = `${htmlPackageDir}/cdn`;
const htmlCdnI18nRegistry = `${htmlCdnDir}/i18n.dev.js`;
const htmlCdnSourceI18n = `${htmlPackageDir}/src/cdn/i18n.ts`;

const cdnSandboxMainSrc = resolve(__dirname, 'src/cdn/main.ts');
const cdnSandboxMainTemplate = resolve(__dirname, 'templates/cdn/main.ts');

/** True when the importer is one of the prebuilt @videojs/html CDN chunks. */
function isHtmlCdnChunk(importer?: string): boolean {
  return importer !== undefined && normalizePath(importer).startsWith(`${htmlCdnDir}/`);
}

/** True when this import should share the single CDN i18n registry module instance. */
function resolvesToCdnI18nRegistry(source: string, importer?: string): boolean {
  const normalizedSource = normalizePath(source);

  if (
    source === '@videojs/html/cdn/i18n' ||
    normalizedSource === htmlCdnI18nRegistry ||
    normalizedSource === htmlCdnSourceI18n
  ) {
    return true;
  }

  const isRelativeI18nChunk =
    source === './i18n.dev.js' || source === '../i18n.dev.js' || source.endsWith('/i18n.dev.js');
  if (isRelativeI18nChunk && isHtmlCdnChunk(importer)) return true;

  if (source === '@videojs/core/i18n' && isHtmlCdnChunk(importer)) {
    return true;
  }

  return false;
}

function resolveHtmlCdnDevEntry(subpath: string): string | null {
  const devPath = resolve(htmlCdnDir, `${subpath}.dev.js`);

  return existsSync(devPath) ? devPath : null;
}

/** Resolve CDN sandbox imports to the prebuilt development entries and registry. */
function cdnSandboxI18nPlugin(): Plugin {
  return {
    name: 'cdn-sandbox-i18n',
    enforce: 'pre',
    resolveId: {
      filter: {
        id: /^@videojs\/(?:core\/i18n|html\/cdn(?:\/.*)?)$|(?:^|\/)i18n\.dev\.js$|\/src\/cdn\/(?:i18n\.ts|main\.ts)$/,
      },
      handler(source, importer) {
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

        return null;
      },
    },
  };
}

/** Keep gitignored `src/` aligned with `templates/` so CDN i18n markup is never stale. */
function sandboxTemplateSyncPlugin(): Plugin {
  return {
    name: 'sandbox-template-sync',
    async buildStart() {
      await mirrorTemplatesToSrc();
    },
  };
}

/** Discover sandbox entries by finding subdirectories of src/ that contain an index.html. */
function getSandboxEntries(): Record<string, string> {
  const srcDir = resolve(__dirname, 'src');
  const entries: Record<string, string> = {};

  // `src` is generated and gitignored. Vite+ loads every workspace config
  // before it can schedule the setup command that creates this directory.
  if (!existsSync(srcDir)) return entries;

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
  run: {
    tasks: {
      dev: {
        command: 'vp dev --host',
        cache: false,
        dependsOn: ['setup', ...workspaceTaskDependencies(), '@videojs/html#build:cdn'],
      },
      setup: {
        command: 'tsx scripts/setup.ts',
        dependsOn: ['@videojs/core#build'],
        // Setup deterministically mirrors tracked templates into the gitignored
        // scratch tree. Keep that generated tree out of its own fingerprint.
        input: ['scripts/setup.ts', 'scripts/shared.ts', 'scripts/generate-cdn-locale-loaders.ts', 'templates/**'],
        output: ['src/**', 'app/shared/i18n/cdn-locale-loaders.generated.ts'],
      },
      build: {
        command: 'vp build',
        dependsOn: ['setup', ...workspaceTaskDependencies(), '@videojs/html#build:cdn'],
        // The app-shell plugin creates this file for the build and removes it
        // afterwards. Workspace dependencies are fingerprinted through the task
        // graph, not their mutable package-local node_modules links.
        input: [...cachedTaskInputs, '!src/index.html', '!node_modules/@videojs', '!node_modules/@videojs/**'],
        output: [...cachedTaskOutputs, '!src/index.html'],
      },
    },
  },
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
    include: ['@videojs/html > @videojs/element > @lit/context', 'react', 'react-dom'],
    exclude: ['@videojs/core', '@videojs/html', '@videojs/react', '@videojs/spf', '@videojs/store', '@videojs/utils'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    rolldownOptions: {
      experimental: {
        nativeMagicString: true,
      },
      // This resolver substitutes the prebuilt CDN graph, whose downstream
      // processing time is attributed to the plugin rather than its fast hooks.
      checks: {
        pluginTimings: false,
      },
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
