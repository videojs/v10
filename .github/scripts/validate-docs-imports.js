/**
 * Validates that @videojs/* imports in documentation code blocks and demo files
 * match actual package export paths declared in their respective package.json.
 *
 * Exits with code 1 if any invalid imports are found.
 *
 * Usage: node .github/scripts/validate-docs-imports.js
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Package export map loading
// ---------------------------------------------------------------------------

function loadPackageExports() {
  const packagesDir = join(ROOT, 'packages');
  const packages = new Map();

  for (const dir of readdirSync(packagesDir)) {
    if (dir === '__tech-preview__' || dir === 'sandbox') continue;

    const pkgJsonPath = join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;

    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    if (!pkg.name || !pkg.exports) continue;

    packages.set(pkg.name, {
      name: pkg.name,
      exportPaths: Object.keys(pkg.exports),
    });
  }

  return packages;
}

// ---------------------------------------------------------------------------
// Import specifier parsing and matching
// ---------------------------------------------------------------------------

/** Parse `@videojs/html/video/player` into `{ packageName, subpath }`. */
function parseSpecifier(specifier) {
  const match = specifier.match(/^(@[^/]+\/[^/]+)(\/.*)?$/);
  if (!match) return null;

  return {
    packageName: match[1],
    subpath: match[2] ? `.${match[2]}` : '.',
  };
}

/**
 * Check if `subpath` matches an export `pattern`.
 * Handles literal paths and single-`*` wildcards per Node.js subpath patterns.
 */
function matchesExport(subpath, pattern) {
  if (pattern === subpath) return true;

  if (!pattern.includes('*')) return false;

  const starIndex = pattern.indexOf('*');
  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);

  if (!subpath.startsWith(prefix)) return false;
  if (suffix && !subpath.endsWith(suffix)) return false;

  const captured = subpath.slice(
    prefix.length,
    suffix ? subpath.length - suffix.length : undefined,
  );

  return captured.length > 0;
}

function validateImport(specifier, packages) {
  const parsed = parseSpecifier(specifier);
  if (!parsed) return { valid: false, reason: 'unparseable specifier' };

  const pkg = packages.get(parsed.packageName);
  if (!pkg) {
    return { valid: false, reason: `unknown package "${parsed.packageName}"` };
  }

  const matches = pkg.exportPaths.some((p) =>
    matchesExport(parsed.subpath, p),
  );

  if (!matches) {
    return {
      valid: false,
      reason: `subpath "${parsed.subpath}" not in exports of ${parsed.packageName}`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Import extraction
// ---------------------------------------------------------------------------

const IMPORT_RE = /(?:import|from)\s+['"](@videojs\/[^'"]+)['"]/g;

/** Extract @videojs/* imports from fenced code blocks in an MDX file. */
function extractMdxImports(content, filePath) {
  const imports = [];
  const fenceRe =
    /```(?:ts|tsx|js|jsx|html|typescript|javascript)[^\n]*\n([\s\S]*?)```/g;

  let fence;

  while ((fence = fenceRe.exec(content)) !== null) {
    let m;

    while ((m = IMPORT_RE.exec(fence[1])) !== null) {
      imports.push({ specifier: m[1], file: filePath });
    }
  }

  return imports;
}

/** Extract @videojs/* imports from a TypeScript / JavaScript source file. */
function extractSourceImports(content, filePath) {
  const imports = [];
  let m;

  while ((m = IMPORT_RE.exec(content)) !== null) {
    imports.push({ specifier: m[1], file: filePath });
  }

  return imports;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findFiles(dir, extensions) {
  const files = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const packages = loadPackageExports();
const errors = [];

// 1. MDX documentation pages (code fences only)
const mdxFiles = findFiles(join(ROOT, 'site/src/content/docs'), ['.mdx']);

for (const file of mdxFiles) {
  const content = readFileSync(file, 'utf8');

  for (const imp of extractMdxImports(content, relative(ROOT, file))) {
    const result = validateImport(imp.specifier, packages);

    if (!result.valid) {
      errors.push({ ...imp, reason: result.reason });
    }
  }
}

// 2. Demo source files (real imports)
const demoFiles = findFiles(join(ROOT, 'site/src/components/docs/demos'), [
  '.ts',
  '.tsx',
]);

for (const file of demoFiles) {
  const content = readFileSync(file, 'utf8');

  for (const imp of extractSourceImports(content, relative(ROOT, file))) {
    const result = validateImport(imp.specifier, packages);

    if (!result.valid) {
      errors.push({ ...imp, reason: result.reason });
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(
    `\nFound ${errors.length} invalid @videojs/* import(s) in documentation:\n`,
  );

  for (const err of errors) {
    console.error(`  ${err.file}: "${err.specifier}" — ${err.reason}`);
  }

  console.error(
    '\nFix these imports to match the export paths in the corresponding package.json.\n',
  );

  process.exit(1);
} else {
  console.log('All @videojs/* imports in documentation are valid.');
}
