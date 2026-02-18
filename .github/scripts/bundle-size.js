/**
 * Measures bundle sizes for all packages, computing marginal subpath costs.
 *
 * Auto-discovers packages from `packages/`, reads their `exports` field to find
 * entry points, and externalizes `peerDependencies`.
 *
 * For packages with subpaths, each subpath is bundled together with the root
 * entry point. The marginal cost is: (root + subpath) - root. This captures
 * shared minification and compression, avoiding the inflated totals you get
 * from summing independently-measured subpaths.
 *
 * Usage: node .github/scripts/bundle-size.js [--json output.json]
 */

import { build } from 'esbuild';
import { brotliCompressSync, constants } from 'node:zlib';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const PACKAGES_DIR = join(ROOT, 'packages');

const SKIP_PACKAGES = new Set(['sandbox', '__tech-preview__', 'react-native']);

/**
 * @typedef {object} SizeEntry
 * @property {string} name
 * @property {number} size - Root: brotli size. Subpath: marginal cost over root.
 * @property {'root' | 'subpath'} type
 */

/** Bundle entry points with esbuild and return the minified + brotli size. */
async function measure(entryPoints, external = []) {
  const result = await build({
    entryPoints,
    bundle: true,
    minify: true,
    treeShaking: true,
    format: 'esm',
    write: false,
    metafile: true,
    outdir: '/tmp/bundle-size-out',
    external,
    logLevel: 'silent',
  });

  const code = result.outputFiles.map((f) => f.text).join('');
  const compressed = brotliCompressSync(Buffer.from(code), {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
    },
  });

  return compressed.length;
}

/**
 * Resolve the `default` condition from an export value.
 * Handles both `{ default: "./dist/..." }` objects and plain string values.
 */
function resolveDefault(exportValue) {
  if (typeof exportValue === 'string') return exportValue;
  if (typeof exportValue === 'object' && exportValue !== null) {
    return exportValue.default ?? null;
  }
  return null;
}

/** Discover packages and their entry points from the filesystem. */
function discoverPackages() {
  const packages = [];

  for (const dirName of readdirSync(PACKAGES_DIR).sort()) {
    if (SKIP_PACKAGES.has(dirName)) continue;

    const pkgJsonPath = join(PACKAGES_DIR, dirName, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    if (!pkgJson.exports) continue;

    const pkgName = pkgJson.name;
    const pkgDir = join(PACKAGES_DIR, dirName);
    const external = pkgJson.peerDependencies
      ? Object.keys(pkgJson.peerDependencies)
      : [];

    let rootPath = null;
    const subpaths = [];

    for (const [key, value] of Object.entries(pkgJson.exports)) {
      // Skip wildcard exports (side-effect registration files)
      if (key.includes('*')) continue;

      const defaultPath = resolveDefault(value);
      if (!defaultPath) continue;

      // Skip types-only exports (no runtime code)
      if (defaultPath.endsWith('.d.ts')) continue;

      const absolutePath = resolve(pkgDir, defaultPath);
      if (!existsSync(absolutePath)) continue;

      // Skip empty files (types-only exports with no runtime code)
      if (readFileSync(absolutePath, 'utf8').trim().length === 0) continue;

      if (key === '.') {
        rootPath = absolutePath;
      } else {
        subpaths.push({
          name: `${pkgName}${key.slice(1)}`,
          path: absolutePath,
        });
      }
    }

    if (rootPath) {
      // Package with a root export (and optional subpaths)
      packages.push({ name: pkgName, rootPath, external, subpaths });
    } else if (subpaths.length > 0) {
      // Package with only subpath exports (e.g., @videojs/utils)
      // Each subpath is measured as an independent root
      for (const sub of subpaths) {
        packages.push({
          name: sub.name,
          rootPath: sub.path,
          external,
          subpaths: [],
        });
      }
    }
  }

  return packages;
}

async function main() {
  const packages = discoverPackages();

  /** @type {SizeEntry[]} */
  const results = [];

  for (const pkg of packages) {
    const rootSize = await measure([pkg.rootPath], pkg.external);
    results.push({ name: pkg.name, size: rootSize, type: 'root' });

    for (const sub of pkg.subpaths) {
      const combinedSize = await measure(
        [pkg.rootPath, sub.path],
        pkg.external,
      );
      const marginal = combinedSize - rootSize;

      results.push({ name: sub.name, size: marginal, type: 'subpath' });
    }
  }

  // Parse --json flag
  const jsonIndex = process.argv.indexOf('--json');
  const outputPath = jsonIndex !== -1 ? process.argv[jsonIndex + 1] : null;

  const output = JSON.stringify(results, null, 2);

  if (outputPath) {
    writeFileSync(outputPath, output);
    console.log(`Written to ${outputPath}`);
  } else {
    console.log(output);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
