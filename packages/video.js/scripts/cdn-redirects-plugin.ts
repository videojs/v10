import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import type { BuildPlugin } from '../../../build/plugins/types.ts';

const require = createRequire(import.meta.url);
const PATH_TOKEN = '__VIDEOJS_8_DIST_PATH__';

/** The Video.js 8 `dist/` files that pages load from a CDN with `<script>` and `<link>` tags. */
const V8_PAGE_FILES = ['*.js', '*.css', 'alt/*.js', 'alt/*.css', 'lang/*.js'];
/** Video.js 8's bundler and Node builds. Those resolve `video.js` through `exports`, never through these paths. */
const V8_MODULE_BUILDS = new Set(['video.cjs.js', 'video.es.js']);

interface CdnRedirectsPluginOptions {
  outDir: string;
  /** Classic-script template; `__VIDEOJS_8_DIST_PATH__` becomes each file's path under `dist/`. */
  template: string;
}

/**
 * Writes a redirect at every Video.js 8 CDN path, so unversioned CDN URLs that now resolve to `video.js@10` keep
 * loading v8. The paths come from the pinned `video.js-8` devDependency. Scripts load the same path from `video.js@8`
 * on the CDN that served them; stylesheets `@import` it relative to their own URL.
 */
export function cdnRedirectsPlugin(options: CdnRedirectsPluginOptions): BuildPlugin {
  const { outDir, template } = options;

  return {
    name: 'video-js-cdn-redirects',
    writeBundle() {
      const v8Dist = join(dirname(require.resolve('video.js-8/package.json')), 'dist');
      // Whole-line comments explain the template to its maintainers; the `/*!` banner explains each copy to readers.
      const script = readFileSync(template, 'utf-8').replaceAll(/^[ \t]*\/\/.*\n/gm, '');
      if (!script.includes(PATH_TOKEN)) throw new Error(`${template} is missing ${PATH_TOKEN}.`);

      for (const file of globSync(V8_PAGE_FILES, { cwd: v8Dist })) {
        const path = file.replaceAll('\\', '/');
        if (V8_MODULE_BUILDS.has(path)) continue;

        const outFile = join(outDir, path);

        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, path.endsWith('.css') ? stylesheetRedirect(path) : script.replaceAll(PATH_TOKEN, path));
      }
    },
  };
}

function stylesheetRedirect(path: string): string {
  // Climb out of the file's folder, `dist/`, and the versioned package folder: `/video.js@10.0.0/dist/` → `/`.
  const root = '../'.repeat(path.split('/').length + 1);

  return [
    '/* video.js@10 has no player. This loads the Video.js 8 stylesheet from video.js@8; pin video.js@8 in your CDN URLs. */',
    `@import url("${root}video.js@8/dist/${path}");`,
    '',
  ].join('\n');
}
