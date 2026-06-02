import path from 'node:path';
import { checkJsDocPresence, type PackageRef } from './check.js';

/** Published packages whose public-API exports must carry a JSDoc summary. */
const PACKAGES: PackageRef[] = [
  { name: '@videojs/react', dir: 'packages/react' },
  { name: '@videojs/html', dir: 'packages/html' },
  { name: '@videojs/core', dir: 'packages/core' },
];

const monorepoRoot = path.resolve(import.meta.dirname, '../../../');

try {
  const { violations } = await checkJsDocPresence(monorepoRoot, PACKAGES);

  // stdout = one violation per line (consumed by check-workspace.mjs); stderr = summary.
  for (const v of violations) {
    process.stdout.write(`${v.package}: ${v.symbol} (${v.file})\n`);
  }
  process.stderr.write(`\n${violations.length} public export(s) missing a JSDoc summary\n`);

  // Exit codes: 0 = clean, 1 = violations (on stdout), 2 = crash. Setting exitCode
  // (instead of calling process.exit) lets Node flush stdout naturally — important
  // because writes to a piped stdout are buffered and process.exit can cut them off.
  process.exitCode = violations.length > 0 ? 1 : 0;
} catch (error) {
  process.stderr.write(`jsdoc-presence check crashed: ${(error as Error)?.stack ?? error}\n`);
  process.exitCode = 2;
}
