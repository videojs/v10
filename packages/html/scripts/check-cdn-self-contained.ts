/**
 * Verify the built CDN output is self-contained.
 *
 * Mirroring `cdn/` onto your own origin is a supported way to run the player (see the site's
 * "Self-host the player" guide), and Drupal-style distributions depend on it. That only holds while
 * every module specifier in the output is relative and resolves inside the directory — a single
 * absolute URL silently reintroduces a runtime dependency on a public CDN, which fails closed in
 * offline, air-gapped, and strict-CSP deployments.
 *
 * Prerequisites: `@videojs/html`'s `build:cdn`.
 */

import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CDN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../cdn');

const PREFIX = '\x1b[35m[check-cdn]\x1b[0m';
const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
};

/** Static `import`/`export … from`, and dynamic `import()`, specifiers. */
const SPECIFIER = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g;

/**
 * Drop matches that cannot be module specifiers.
 *
 * The scan is a regex rather than a parser, so it also sees the words `from` and `import` inside
 * prose — JSDoc retained in dev bundles, and template literals such as `` `… from "${type}"` ``.
 * Real specifiers emitted by the bundler are plain paths, so anything carrying whitespace or
 * template syntax is prose.
 */
function isLikelySpecifier(value: string): boolean {
  return value.length > 0 && !/[\s{}$`]/.test(value);
}

function collectSpecifiers(code: string): string[] {
  return [...code.matchAll(SPECIFIER)].map((match) => match[1] as string).filter(isLikelySpecifier);
}

function main() {
  if (!existsSync(CDN_DIR)) {
    log.error(`CDN build not found at ${CDN_DIR}. Run \`pnpm -F @videojs/html build:cdn\` first.`);
    process.exit(1);
  }

  const files = globSync('**/*.js', { cwd: CDN_DIR }).sort();

  if (files.length === 0) {
    log.error(`No JavaScript bundles found in ${CDN_DIR}.`);
    process.exit(1);
  }

  const problems: string[] = [];
  let checked = 0;

  for (const file of files) {
    const path = resolve(CDN_DIR, file);

    for (const specifier of collectSpecifiers(readFileSync(path, 'utf8'))) {
      checked++;

      if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(specifier)) {
        problems.push(`${file}: absolute specifier "${specifier}"`);
        continue;
      }

      // A bare specifier has no importer to resolve it in the browser.
      if (!specifier.startsWith('.')) {
        problems.push(`${file}: bare specifier "${specifier}"`);
        continue;
      }

      if (!existsSync(resolve(dirname(path), specifier))) {
        problems.push(
          `${file}: "${specifier}" resolves outside the build (${relative(CDN_DIR, resolve(dirname(path), specifier))})`
        );
      }
    }
  }

  if (problems.length > 0) {
    log.error(`${problems.length} specifier(s) break self-hosting:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }

  log.info(`✅ ${files.length} bundles, ${checked} specifiers — all resolve inside cdn/`);
}

main();
