/**
 * Start the docs site dev server without replaying the whole workspace task graph.
 *
 * `vp run site#dev` used to depend on `api-docs:generate` and `cdn-manifest`, which depend on every workspace package
 * build. Even with every task cached, Vite+ spent ~16s discovering configs and replaying 34 cache hits before `astro
 * dev` ran. Astro itself is ready in a few seconds, so this launcher only runs that graph (`site#dev:prepare`) when
 * generated content or the workspace builds Astro imports are missing, or when asked to with `--prepare`.
 *
 * Any other arguments are forwarded to `astro dev`, for example `pnpm dev:site --port 4399`.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = resolve(SITE_ROOT, '..');
const PREPARE_FLAG = '--prepare';

/** Collections written by the `api-docs:generate` task; keep in sync with its `output` in `vite.config.ts`. */
const GENERATED_REFERENCE_DIRS = ['component', 'util', 'feature', 'media', 'preset'].map(
  (kind) => `src/content/generated-${kind}-reference`
);

/** Written by the `cdn-manifest` task. */
const CDN_MANIFEST = 'src/content/cdn-media.json';

/** Workspace packages Astro imports through their built `dist` exports. */
const WORKSPACE_PACKAGES = ['@videojs/html', '@videojs/react'];

const PREFIX = '\x1b[36m[dev:site]\x1b[0m';

function hasJsonFiles(directory: string): boolean {
  return existsSync(directory) && readdirSync(directory).some((file) => file.endsWith('.json'));
}

/** Site-relative descriptions of everything `astro dev` needs that is not present under `siteRoot`. */
export function missingPrerequisites(siteRoot = SITE_ROOT): string[] {
  const missing: string[] = [];

  for (const directory of GENERATED_REFERENCE_DIRS) {
    if (!hasJsonFiles(join(siteRoot, directory))) missing.push(directory);
  }

  if (!existsSync(join(siteRoot, CDN_MANIFEST))) missing.push(CDN_MANIFEST);

  for (const name of WORKSPACE_PACKAGES) {
    if (!existsSync(join(siteRoot, 'node_modules', name, 'dist'))) missing.push(`${name} build`);
  }

  return missing;
}

function run(command: string, args: string[], cwd: string, env = process.env): number {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;

  return result.status ?? 1;
}

export function main(argv = process.argv.slice(2)): number {
  const prepare = argv.includes(PREPARE_FLAG);
  const astroArgs = argv.filter((arg) => arg !== PREPARE_FLAG);
  const missing = prepare ? [] : missingPrerequisites();

  if (prepare || missing.length > 0) {
    if (missing.length > 0) console.log(PREFIX, `Missing ${missing.join(', ')}; running site#dev:prepare first.`);

    const status = run('pnpm', ['exec', 'vp', 'run', 'site#dev:prepare'], WORKSPACE_ROOT);
    if (status !== 0) return status;
  } else {
    console.log(PREFIX, `Reusing generated content. Run \`pnpm dev:site ${PREPARE_FLAG}\` to rebuild it.`);
  }

  return run('pnpm', ['exec', 'astro', 'dev', ...astroArgs], SITE_ROOT, { ...process.env, NETLIFY_DEV: '1' });
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isEntrypoint) process.exitCode = main();
