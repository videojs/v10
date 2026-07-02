/**
 * Build the CDN media manifest for the installation guide.
 *
 * Scans the built `@videojs/html` CDN media bundles and records which media
 * subpaths actually ship a CDN build. The installation page uses this to hide
 * the CDN install option for renderers that have no CDN bundle (e.g. Vimeo).
 *
 * Produces `site/src/content/cdn-media.json` as an array of `{ id }` entries
 * (one per media subpath), consumed via the `cdnMedia` content collection.
 *
 * Source of truth: the built output of `@videojs/html`'s `build:cdn` task
 * (configured in `packages/html/tsdown.cdn.config.ts`). Reading the build
 * output — rather than a hand-maintained list — means a renderer that fails to
 * ship a CDN bundle correctly shows as no-CDN.
 *
 * Prerequisites: `@videojs/html`'s `build:cdn` (wired as a turbo dependency).
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const CDN_MEDIA_DIR = resolve(ROOT, 'packages/html/cdn/media');
const OUTPUT = resolve(ROOT, 'site/src/content/cdn-media.json');

const PREFIX = '\x1b[35m[cdn-manifest]\x1b[0m';
const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, '\x1b[33mwarn:\x1b[0m', ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
};

const ManifestSchema = z.array(z.object({ id: z.string() }));

function main() {
  if (!existsSync(CDN_MEDIA_DIR)) {
    log.error(`CDN media build not found at ${CDN_MEDIA_DIR}.`);
    log.error("Run @videojs/html's build:cdn first (it's wired as a turbo dependency).");
    process.exit(1);
  }

  // Production bundles are `<subpath>.js`; skip dev (`.dev.js`), sourcemaps,
  // and type stubs.
  const subpaths = readdirSync(CDN_MEDIA_DIR)
    .filter((file) => file.endsWith('.js') && !file.endsWith('.dev.js'))
    .map((file) => file.replace(/\.js$/, ''))
    .sort();

  if (subpaths.length === 0) {
    log.error(`No CDN media bundles found in ${CDN_MEDIA_DIR}.`);
    process.exit(1);
  }

  const entries = ManifestSchema.parse(subpaths.map((id) => ({ id })));

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(entries, null, 2)}\n`);

  log.info(`✅ Wrote ${entries.length} CDN media entries to ${OUTPUT}`);
}

main();
