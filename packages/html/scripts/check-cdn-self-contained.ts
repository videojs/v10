/**
 * Verify the built CDN output is self-contained.
 *
 * Mirroring `cdn/` onto your own origin is a supported way to run the player (see the site's "Self-host the player"
 * guide), and the release distribution archive is cut from this output. That only holds while every module specifier is
 * relative and resolves inside the directory — a single absolute URL silently reintroduces a runtime dependency on a
 * public CDN, which fails closed in offline, air-gapped, and strict-CSP deployments.
 *
 * Prerequisites: `@videojs/html`'s `build:cdn`.
 */

import { existsSync, globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findUnresolvableSpecifiers } from './cdn-graph.ts';

const CDN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../cdn');

const PREFIX = '\x1b[35m[check-cdn]\x1b[0m';
const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
};

function main() {
  if (!existsSync(CDN_DIR)) {
    log.error(`CDN build not found at ${CDN_DIR}. Run \`pnpm build:cdn\` from the workspace root first.`);
    process.exit(1);
  }

  const files = globSync('**/*.js', { cwd: CDN_DIR }).sort();

  if (files.length === 0) {
    log.error(`No JavaScript bundles found in ${CDN_DIR}.`);
    process.exit(1);
  }

  const problems = findUnresolvableSpecifiers(CDN_DIR, files);

  if (problems.length > 0) {
    log.error(`${problems.length} specifier(s) break self-hosting:`);

    for (const problem of problems) console.error(`  ${problem}`);

    process.exit(1);
  }

  log.info(`✅ ${files.length} bundles — every specifier resolves inside cdn/`);
}

main();
