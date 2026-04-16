/**
 * Validates that all server entry points are safe to import in a non-browser
 * environment.
 *
 * Auto-discovers packages from `packages/`, reads their `exports` field to find
 * entries with a `browser`/`default` condition split, resolves the `default`
 * (server) path, and dynamically imports each one. Any module that throws
 * during evaluation (e.g. due to missing browser globals) is reported.
 *
 * Requires packages to be built first (`pnpm build:packages`).
 *
 * Usage: node .github/scripts/ssr-check.js
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');
const PACKAGES_DIR = join(ROOT, 'packages');

const SKIP_PACKAGES = new Set([
  'react-native',
  'skins',
  'icons',
]);

/**
 * Resolve the server path from an export value.
 *
 * Only returns a path for entries with a `browser`/`default` split (these are
 * the ones that have separate server builds). The top-level `default` is the
 * server entry point.
 */
function resolveServerPath(exportValue) {
  if (typeof exportValue !== 'object' || exportValue === null) return null;
  if (!('browser' in exportValue)) return null;
  return typeof exportValue.default === 'string' ? exportValue.default : null;
}

/**
 * Resolve a wildcard export key to actual server files on disk.
 */
function resolveWildcard(pkgDir, exportKey, exportValue) {
  const serverPath = resolveServerPath(exportValue);
  if (!serverPath) return [];

  const fullPattern = resolve(pkgDir, serverPath);
  const starIdx = fullPattern.indexOf('*');
  if (starIdx === -1) return [];

  const lastSlash = fullPattern.lastIndexOf('/', starIdx);
  const scanDir = fullPattern.slice(0, lastSlash);
  const prefix = fullPattern.slice(lastSlash + 1, starIdx);
  const suffix = fullPattern.slice(starIdx + 1);

  if (!existsSync(scanDir)) return [];

  const isDirectoryPattern = suffix.startsWith('/');

  return readdirSync(scanDir, { withFileTypes: true })
    .filter((d) => {
      if (!d.name.startsWith(prefix)) return false;
      return isDirectoryPattern ? d.isDirectory() : d.isFile();
    })
    .filter((d) => {
      if (isDirectoryPattern) return true;
      return d.name.endsWith(suffix);
    })
    .map((d) => {
      const stem = isDirectoryPattern
        ? d.name.slice(prefix.length)
        : d.name.slice(prefix.length, d.name.length - suffix.length);
      const fullPath = fullPattern.replace('*', stem);
      return { stem, fullPath };
    })
    .filter(({ fullPath }) => {
      if (!existsSync(fullPath)) return false;
      return readFileSync(fullPath, 'utf8').trim().length > 0;
    })
    .sort((a, b) => a.stem.localeCompare(b.stem))
    .map(({ stem, fullPath }) => ({
      label: `${exportKey.replace('*', stem)}`,
      path: fullPath,
    }));
}

/** Discover all server entry points across packages. */
function discoverServerEntries() {
  const entries = [];

  for (const dirName of readdirSync(PACKAGES_DIR).sort()) {
    if (SKIP_PACKAGES.has(dirName)) continue;

    const pkgJsonPath = join(PACKAGES_DIR, dirName, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    if (!pkgJson.exports) continue;

    const pkgName = pkgJson.name;
    const pkgDir = join(PACKAGES_DIR, dirName);

    for (const [key, value] of Object.entries(pkgJson.exports)) {
      if (key.endsWith('.css')) continue;

      if (key.includes('*')) {
        for (const r of resolveWildcard(pkgDir, key, value)) {
          entries.push({
            name: `${pkgName}/${r.label.slice(2)}`,
            path: r.path,
          });
        }
        continue;
      }

      const serverPath = resolveServerPath(value);
      if (!serverPath) continue;

      const absolutePath = resolve(pkgDir, serverPath);
      if (!existsSync(absolutePath)) continue;
      if (readFileSync(absolutePath, 'utf8').trim().length === 0) continue;

      const label = key === '.' ? pkgName : `${pkgName}/${key.slice(2)}`;
      entries.push({ name: label, path: absolutePath });
    }
  }

  return entries;
}

const entries = discoverServerEntries();

if (entries.length === 0) {
  console.error('No server entry points found. Are packages built?');
  process.exit(1);
}

console.log(`Checking ${entries.length} server entry points...\n`);

const failures = [];

for (const entry of entries) {
  const url = pathToFileURL(entry.path).href;
  try {
    await import(url);
    console.log(`  ✓ ${entry.name}`);
  } catch (error) {
    console.log(`  ✗ ${entry.name}`);
    failures.push({ name: entry.name, error });
  }
}

console.log();

if (failures.length > 0) {
  console.error(`${failures.length} entry point(s) failed:\n`);
  for (const { name, error } of failures) {
    console.error(`  ${name}:`);
    console.error(`    ${error.message}\n`);
  }
  process.exit(1);
}

console.log(`All ${entries.length} server entry points imported successfully.`);
