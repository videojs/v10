/**
 * Workspace consistency checker.
 *
 * Validates that manually-maintained lists across config files stay in sync
 * with the actual package structure. Run via `pnpm check:workspace`.
 *
 * Checks:
 * 1. CI test coverage — every testable package is tested in CI
 * 2. Commitlint scopes — every package dir is a valid commit scope
 * 3. Root tsconfig references — every composite project is referenced
 * 4. Package metadata — non-private packages have required fields
 * 5. Release-please config — every versioned package is registered
 * 6. Define imports — no bare side-effect imports from relative paths
 * 7. Server bundles — browser/default export conditions match tsdown config
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PACKAGES_DIR = join(ROOT, 'packages');

// ── Helpers ─────────────────────────────────────────────────────────────────

function readText(path) {
  return readFileSync(path, 'utf8');
}

function readJson(path) {
  const text = readText(path);
  // Strip single-line // comments (for tsconfig files).
  const stripped = text.replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(stripped);
}

/** Lists package directory names that contain a package.json. */
function getPackageDirs() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(PACKAGES_DIR, d.name, 'package.json')))
    .map((d) => d.name);
}

function readPackageJson(dir) {
  return readJson(join(PACKAGES_DIR, dir, 'package.json'));
}

// ── Check 1: CI test coverage ───────────────────────────────────────────────

function checkCiTestCoverage() {
  const warnings = [];
  const ciText = readText(join(ROOT, '.github/workflows/ci.yml'));

  // Collect package names from the test matrix.
  const matrixMatch = ciText.match(/matrix:\s*\n\s*package:\s*\n((?:\s*-\s*'[^']+'\s*\n)+)/);
  const testedInCi = new Set();

  if (matrixMatch) {
    for (const m of matrixMatch[1].matchAll(/'([^']+)'/g)) {
      testedInCi.add(m[1]);
    }
  }

  // Collect package names from standalone test jobs (e.g. test-spf).
  // Match: `--filter="@videojs/xxx"` in turbo run test commands.
  for (const m of ciText.matchAll(/turbo run test --filter="([^"]+)"/g)) {
    testedInCi.add(m[1]);
  }

  // Find packages that have a "test" script but aren't tested in CI.
  for (const dir of getPackageDirs()) {
    const pkg = readPackageJson(dir);
    if (!pkg.scripts?.test) continue;
    if (!testedInCi.has(pkg.name)) {
      warnings.push(`${pkg.name} has a "test" script but is not tested in CI`);
    }
  }

  return { ok: warnings.length === 0, warnings };
}

// ── Check 2: Commitlint scope-enum ──────────────────────────────────────────

/**
 * Known aliases where the commit scope differs from the directory name.
 * Key: directory name, Value: expected scope.
 */
const SCOPE_ALIASES = new Map([['skins', 'skin']]);

function checkCommitlintScopes() {
  const warnings = [];
  const text = readText(join(ROOT, 'commitlint.config.js'));

  // Extract the array from scope-enum rule.
  const match = text.match(/scope-enum[^[]*\[([^\]]+)\]/s);
  if (!match) {
    return { ok: false, warnings: ['Could not parse scope-enum from commitlint.config.js'] };
  }

  const scopes = new Set([...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));

  for (const dir of getPackageDirs()) {
    const scope = SCOPE_ALIASES.get(dir) ?? dir;
    if (!scopes.has(scope)) {
      warnings.push(`Package dir "${dir}" missing from commitlint scope-enum (expected scope: "${scope}")`);
    }
  }

  return { ok: warnings.length === 0, warnings };
}

// ── Check 3: Root tsconfig references ───────────────────────────────────────

/**
 * Intentionally excluded from root references.
 * packages/icons: private, custom build script, uses outDir/rootDir instead of declarationDir.
 */
const TSCONFIG_EXCLUDE = new Set(['packages/icons']);

function checkTsconfigReferences() {
  const warnings = [];
  const rootTsconfig = readJson(join(ROOT, 'tsconfig.json'));
  const baseTsconfig = readJson(join(ROOT, 'tsconfig.base.json'));

  const referenced = new Set(rootTsconfig.references.map((r) => r.path));

  // Base config sets composite: true, so all extending configs inherit it.
  const baseComposite = baseTsconfig.compilerOptions?.composite === true;

  // Find all tsconfig.json files under packages/ recursively.
  function findTsconfigs(dir, results = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'types') {
        continue;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        findTsconfigs(full, results);
      } else if (entry.name === 'tsconfig.json') {
        results.push(full);
      }
    }
    return results;
  }

  for (const tsconfigPath of findTsconfigs(PACKAGES_DIR)) {
    const relative = tsconfigPath.slice(ROOT.length + 1).replace(/\/tsconfig\.json$/, '');

    if (TSCONFIG_EXCLUDE.has(relative)) continue;

    const tsconfig = readJson(tsconfigPath);
    const explicitComposite = tsconfig.compilerOptions?.composite;

    // Composite if explicitly true, or inherited from base and not overridden.
    const isComposite = explicitComposite === true || (explicitComposite === undefined && baseComposite);

    if (!isComposite) continue;

    if (!referenced.has(relative)) {
      warnings.push(`Missing reference: ${relative}`);
    }
  }

  return { ok: warnings.length === 0, warnings };
}

// ── Check 4: Package metadata ───────────────────────────────────────────────

/** Required on all non-private packages. */
const REQUIRED_FIELDS = ['sideEffects', 'files', 'exports'];

/** Required only when the package has a root "." export. */
const ROOT_EXPORT_FIELDS = ['main', 'module', 'types'];

/**
 * Packages excluded from metadata checks.
 * CLI is bin-only — sideEffects/exports don't apply.
 */
const METADATA_EXCLUDE = new Set(['cli']);

function checkPackageMetadata() {
  const warnings = [];

  for (const dir of getPackageDirs()) {
    const pkg = readPackageJson(dir);

    // Skip private packages — they're internal.
    if (pkg.private) continue;

    // Skip packages that don't need library metadata.
    if (METADATA_EXCLUDE.has(dir)) continue;

    // publishConfig.access is required for scoped public packages.
    if (pkg.publishConfig?.access !== 'public') {
      warnings.push(`${pkg.name}: missing publishConfig.access = "public"`);
    }

    for (const field of REQUIRED_FIELDS) {
      if (pkg[field] === undefined) {
        warnings.push(`${pkg.name}: missing "${field}"`);
      }
    }

    // main/module/types only required when there's a root "." export.
    const hasRootExport = pkg.exports?.['.'] !== undefined;
    if (hasRootExport) {
      for (const field of ROOT_EXPORT_FIELDS) {
        if (pkg[field] === undefined) {
          warnings.push(`${pkg.name}: missing "${field}" (has "." export)`);
        }
      }
    }
  }

  return { ok: warnings.length === 0, warnings };
}

// ── Check 5: Release-please config ──────────────────────────────────────────

function checkReleasePleaseConfig() {
  const warnings = [];
  const config = readJson(join(ROOT, '.github/release-please/release-please-config.json'));

  const configPackages = new Set(Object.keys(config.packages));
  const linkedVersions = config.plugins.find((p) => p.type === 'linked-versions');
  const components = new Set(linkedVersions?.components ?? []);

  // Every package with a version field should be registered.
  for (const dir of getPackageDirs()) {
    const pkg = readPackageJson(dir);
    if (!pkg.version) continue;

    const pkgPath = `packages/${dir}`;
    if (!configPackages.has(pkgPath)) {
      warnings.push(`${pkg.name}: missing from release-please packages`);
    }
    if (!components.has(pkg.name)) {
      warnings.push(`${pkg.name}: missing from release-please linked-versions components`);
    }
  }

  return { ok: warnings.length === 0, warnings };
}

// ── Check 6: Define imports ──────────────────────────────────────────────────

/**
 * Bare side-effect imports from relative paths in the define directory cause
 * non-deterministic registration order when loaded as native ESM in the
 * browser. All registration must go through explicit safeDefine() calls.
 */
function checkDefineImports() {
  const warnings = [];
  const defineDir = join(PACKAGES_DIR, 'html/src/define');

  if (!existsSync(defineDir)) {
    return { ok: true, warnings: [] };
  }

  // Matches: import './foo';  import "../bar";  import './foo/bar';
  // Ignores value imports: import { X } from './foo';  import X from './foo';
  // Ignores CSS imports: import './foo.css';  import './foo.css?inline';
  const sideEffectImportRe = /^import\s+['"](\.[^'"]+)['"]\s*;/gm;
  const cssSpecifierRe = /\.css(?:\?|$)/;

  function findTsFiles(dir, results = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'tests') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        findTsFiles(full, results);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        results.push(full);
      }
    }
    return results;
  }

  for (const filePath of findTsFiles(defineDir)) {
    const content = readText(filePath);
    const relative = filePath.slice(ROOT.length + 1);

    const sideEffects = [];
    for (const match of content.matchAll(sideEffectImportRe)) {
      const specifier = match[1];
      if (cssSpecifierRe.test(specifier)) continue;
      sideEffects.push(specifier);
    }

    // A single side-effect import (e.g. skin importing its ui module) is safe
    // because ESM evaluates it synchronously before the importing module's body.
    // Multiple side-effect imports are the problem — they race in the browser.
    if (sideEffects.length > 1) {
      for (const specifier of sideEffects) {
        warnings.push(`${relative}: bare side-effect import "${specifier}" — use safeDefine() instead`);
      }
    }
  }

  return { ok: warnings.length === 0, warnings };
}

// ── Check 7: Server bundles ──────────────────────────────────────────────────

/**
 * Packages with `browser` export conditions must have a matching server build
 * in tsdown (build mode 'server', `__BROWSER__` define, `platform: 'node'`).
 *
 * For each export entry with a `browser` condition:
 * - The sibling `default` path must point to `dist/server/`
 * - The tsdown config must declare a `'server'` build mode
 * - The tsdown config must define `__BROWSER__`
 */
function checkServerBundles() {
  const warnings = [];

  for (const dir of getPackageDirs()) {
    const pkg = readPackageJson(dir);
    if (pkg.private) continue;

    const exports = pkg.exports;
    if (!exports) continue;

    // Collect export keys that have a `browser` condition.
    const browserExports = [];

    for (const [key, value] of Object.entries(exports)) {
      if (typeof value !== 'object' || value === null) continue;
      if ('browser' in value) {
        browserExports.push(key);

        // The `default` sibling must resolve to dist/server/.
        const serverPath = value.default;
        if (typeof serverPath === 'string' && !serverPath.includes('dist/server/')) {
          warnings.push(
            `${pkg.name}: export "${key}" has \`browser\` condition but \`default\` path "${serverPath}" does not point to dist/server/`
          );
        }
      }
    }

    if (browserExports.length === 0) continue;

    // Validate tsdown config has server build mode and __BROWSER__ define.
    const tsdownPath = join(PACKAGES_DIR, dir, 'tsdown.config.ts');
    if (!existsSync(tsdownPath)) {
      warnings.push(`${pkg.name}: has \`browser\` exports but no tsdown.config.ts`);
      continue;
    }

    const tsdownText = readText(tsdownPath);

    if (!/'server'/.test(tsdownText)) {
      warnings.push(`${pkg.name}: has \`browser\` exports but tsdown.config.ts is missing 'server' build mode`);
    }

    if (!/__BROWSER__/.test(tsdownText)) {
      warnings.push(`${pkg.name}: has \`browser\` exports but tsdown.config.ts does not define __BROWSER__`);
    }

    if (!/platform.*['"]node['"]/.test(tsdownText)) {
      warnings.push(
        `${pkg.name}: has \`browser\` exports but tsdown.config.ts does not set platform to 'node' for server builds`
      );
    }
  }

  return { ok: warnings.length === 0, warnings };
}

// ── Main ────────────────────────────────────────────────────────────────────

const checks = [
  { name: 'CI test coverage', fn: checkCiTestCoverage },
  { name: 'Commitlint scopes', fn: checkCommitlintScopes },
  { name: 'Root tsconfig references', fn: checkTsconfigReferences },
  { name: 'Package metadata', fn: checkPackageMetadata },
  { name: 'Release-please config', fn: checkReleasePleaseConfig },
  { name: 'Define imports', fn: checkDefineImports },
  { name: 'Server bundles', fn: checkServerBundles },
];

let failed = 0;

for (const check of checks) {
  const result = check.fn();
  if (result.ok) {
    console.log(`\x1b[32m✓\x1b[0m ${check.name}`);
  } else {
    failed++;
    console.log(`\x1b[31m✗\x1b[0m ${check.name}`);
    for (const w of result.warnings) {
      console.log(`    ${w}`);
    }
  }
}

console.log();
console.log(`${checks.length - failed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);
