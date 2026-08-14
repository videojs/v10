/**
 * Build the distribution archives attached to each `@videojs/html` GitHub release.
 *
 * Package managers outside npm — Composer for Drupal, and anything vendoring a versioned
 * tarball — need a downloadable, browser-ready copy of the player. This assembles one from the
 * production CDN bundles: entry points, the shared chunks they import, and nothing else.
 *
 * Everything is copied out of the existing `build:cdn` output rather than rebuilt, so the archive
 * ships the same bundles the CDN serves. Sourcemaps are left out to keep the download small, and
 * their now-dangling `sourceMappingURL` comments are stripped so browsers do not request them.
 *
 * Prerequisites: `@videojs/html`'s `build:cdn`. Requires `zip` and `tar` on PATH.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUnresolvableSpecifiers, resolveClosure } from './cdn-graph.ts';

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_DIR, '../..');
const CDN_DIR = resolve(PACKAGE_DIR, 'cdn');
const OUT_DIR = resolve(PACKAGE_DIR, 'archive');

const PREFIX = '\x1b[35m[dist-archive]\x1b[0m';
const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
};

const SOURCE_MAPPING_URL = /\n?\/\/# sourceMappingURL=.*$/;

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });

  if (result.error) {
    throw new Error(`\`${command}\` is required to build the archive but could not be run: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`\`${command} ${args.join(' ')}\` exited with ${result.status}`);
  }
}

function sha256(path: string): string {
  const result = spawnSync('shasum', ['-a', '256', path], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Could not checksum ${path}`);
  return (result.stdout.split(' ')[0] as string).trim();
}

async function main() {
  if (!existsSync(CDN_DIR)) {
    log.error(`CDN build not found at ${CDN_DIR}. Run \`pnpm -F @videojs/html build:cdn\` first.`);
    process.exit(1);
  }

  // The build config resolves its entry globs against the working directory.
  process.chdir(PACKAGE_DIR);
  const [{ entries }, pkg] = await Promise.all([
    import('../tsdown.cdn.config.ts'),
    import('../package.json', { with: { type: 'json' } }).then((module) => module.default),
  ]);

  const name = `videojs-html-${pkg.version}`;
  const stageDir = resolve(OUT_DIR, name);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  // Production entries only: dev bundles carry a `.dev` suffix and are not part of a distribution.
  const roots = entries.map(({ name: entry }) => `${entry}.js`);
  const files = [...resolveClosure(CDN_DIR, roots)].sort();

  for (const file of files) {
    const target = join(stageDir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(resolve(CDN_DIR, file), 'utf8').replace(SOURCE_MAPPING_URL, '\n'));
  }

  // The archive is what self-hosters actually run, so verify the copy rather than trusting that
  // the reachable set stayed self-contained.
  const problems = findUnresolvableSpecifiers(stageDir, files);
  if (problems.length > 0) {
    log.error(`${problems.length} specifier(s) would break the archive:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }

  cpSync(resolve(REPO_ROOT, 'LICENSE'), resolve(stageDir, 'LICENSE'));
  cpSync(resolve(PACKAGE_DIR, 'README.md'), resolve(stageDir, 'README.md'));
  writeFileSync(resolve(stageDir, 'VERSION'), `${pkg.version}\n`);

  run('zip', ['--quiet', '--recurse-paths', `${name}.zip`, name], OUT_DIR);
  run('tar', ['--create', '--gzip', '--file', `${name}.tar.gz`, name], OUT_DIR);

  const archives = [`${name}.zip`, `${name}.tar.gz`];
  writeFileSync(
    resolve(OUT_DIR, 'SHA256SUMS'),
    `${archives.map((archive) => `${sha256(resolve(OUT_DIR, archive))}  ${archive}`).join('\n')}\n`
  );

  log.info(`✅ ${files.length} bundles from ${roots.length} entries`);
  for (const archive of archives) {
    const size = (statSync(resolve(OUT_DIR, archive)).size / 1024).toFixed(0);
    log.info(`   archive/${archive} (${size} KB)`);
  }
}

main().catch((error: unknown) => {
  log.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
