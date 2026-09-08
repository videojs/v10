/**
 * Selects package tests affected by a pull request and groups them into a small
 * number of balanced GitHub Actions jobs.
 *
 * Changed packages and all of their workspace dependents are selected. Changes
 * to shared build or toolchain files select every package test. Pushes to main
 * pass `--all` so the default branch always receives full coverage.
 *
 * Usage:
 *   printf '%s\n' packages/core/src/index.ts | node .github/scripts/package-test-matrix.js
 *   node .github/scripts/package-test-matrix.js --all
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const MAX_SHARDS = 4;
const TARGET_PACKAGES_PER_SHARD = 5;

const GLOBAL_FILES = new Set([
  '.node-version',
  '.npmrc',
  '.nvmrc',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'tsconfig.json',
  'vite.config.ts',
]);

const TEST_WEIGHTS = new Map([
  ['@videojs/react', 6],
  ['@videojs/skins', 5],
  ['@videojs/core', 4],
  ['@videojs/html', 4],
  ['@videojs/utils', 3],
  ['@videojs/cdn', 2],
  ['@videojs/icons', 2],
  ['@videojs/media', 2],
  ['@videojs/sandbox', 2],
  ['@videojs/spotify-audio', 2],
  ['vjsc', 2],
]);

export const SPECIAL_TEST_PACKAGES = new Set(['@videojs/spf']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function normalizePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

function packageRecord(root, directory) {
  const packageJson = readJson(join(root, directory, 'package.json'));
  const dependencies = new Set();

  for (const field of DEPENDENCY_FIELDS) {
    for (const name of Object.keys(packageJson[field] ?? {})) dependencies.add(name);
  }

  return {
    name: packageJson.name,
    directory: normalizePath(directory),
    dependencies,
    scripts: packageJson.scripts ?? {},
  };
}

/** Discover the workspace layout without requiring dependencies to be installed. */
export function discoverWorkspacePackages(root) {
  const directories = [];
  const packagesDirectory = join(root, 'packages');

  for (const entry of readdirSync(packagesDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const directory = join(packagesDirectory, entry.name);

    if (existsSync(join(directory, 'package.json'))) {
      directories.push(relative(root, directory));
      continue;
    }

    for (const child of readdirSync(directory, { withFileTypes: true })) {
      const childDirectory = join(directory, child.name);

      if (child.isDirectory() && existsSync(join(childDirectory, 'package.json'))) {
        directories.push(relative(root, childDirectory));
      }
    }
  }

  const appsDirectory = join(root, 'apps');

  for (const entry of readdirSync(appsDirectory, { withFileTypes: true })) {
    const directory = join(appsDirectory, entry.name);

    if (entry.isDirectory() && existsSync(join(directory, 'package.json'))) {
      directories.push(relative(root, directory));
    }
  }

  if (existsSync(join(root, 'site/package.json'))) directories.push('site');

  return directories.map((directory) => packageRecord(root, directory)).sort((a, b) => a.name.localeCompare(b.name));
}

/** Workspaces eligible for affected package-test selection in the main CI workflow. */
export function isMainCiTestPackage(pkg) {
  return Boolean(pkg.scripts.test) && (pkg.directory.startsWith('packages/') || pkg.directory === 'apps/sandbox');
}

function selectsEveryPackage(file) {
  return (
    GLOBAL_FILES.has(file) ||
    file.startsWith('build/') ||
    file === '.github/workflows/ci.yml' ||
    file === '.github/scripts/package-test-matrix.js'
  );
}

/** Select directly changed packages and their transitive workspace dependents. */
export function selectAffectedPackageNames(workspacePackages, changedFiles, forceAll = false) {
  const testPackages = workspacePackages.filter(isMainCiTestPackage);
  const allTestPackageNames = testPackages.map(({ name }) => name).sort((a, b) => a.localeCompare(b));
  const files = [...new Set(changedFiles.map(normalizePath).filter(Boolean))];

  if (forceAll || files.some(selectsEveryPackage)) return allTestPackageNames;

  const packagesByName = new Map(workspacePackages.map((pkg) => [pkg.name, pkg]));
  const packagesByDirectory = [...workspacePackages].sort((a, b) => b.directory.length - a.directory.length);
  const changedPackageNames = new Set();

  for (const file of files) {
    const owner = packagesByDirectory.find(
      ({ directory }) => file === directory || file.startsWith(`${directory}/`)
    );

    if (owner) {
      changedPackageNames.add(owner.name);
    } else if (file.startsWith('packages/')) {
      // A removed or newly nested package cannot be reconstructed from the
      // checked-out tree, so retain full coverage for that uncommon case.
      return allTestPackageNames;
    }
  }

  const dependents = new Map(workspacePackages.map(({ name }) => [name, new Set()]));

  for (const pkg of workspacePackages) {
    for (const dependency of pkg.dependencies) {
      if (packagesByName.has(dependency)) dependents.get(dependency).add(pkg.name);
    }
  }

  const affectedPackageNames = new Set(changedPackageNames);
  const queue = [...changedPackageNames];

  for (let index = 0; index < queue.length; index++) {
    for (const dependent of dependents.get(queue[index]) ?? []) {
      if (affectedPackageNames.has(dependent)) continue;

      affectedPackageNames.add(dependent);
      queue.push(dependent);
    }
  }

  return allTestPackageNames.filter((name) => affectedPackageNames.has(name));
}

/** Balance selected packages while avoiding one runner installation per package. */
export function createPackageTestShards(packageNames) {
  if (packageNames.length === 0) return [];

  const shardCount = Math.min(MAX_SHARDS, Math.ceil(packageNames.length / TARGET_PACKAGES_PER_SHARD));
  const shards = Array.from({ length: shardCount }, () => ({ packages: [], weight: 0 }));
  const weightedPackages = [...packageNames].sort((a, b) => {
    const weightDifference = (TEST_WEIGHTS.get(b) ?? 1) - (TEST_WEIGHTS.get(a) ?? 1);

    return weightDifference || a.localeCompare(b);
  });

  for (const packageName of weightedPackages) {
    const shard = shards.reduce((lightest, candidate) => {
      if (candidate.weight !== lightest.weight) return candidate.weight < lightest.weight ? candidate : lightest;

      return candidate.packages.length < lightest.packages.length ? candidate : lightest;
    });

    shard.packages.push(packageName);
    shard.weight += TEST_WEIGHTS.get(packageName) ?? 1;
  }

  return shards.map(({ packages }, index) => ({
    name: `${index + 1}/${shards.length}`,
    packages: packages.sort((a, b) => a.localeCompare(b)),
  }));
}

export function createPackageTestSelection({ root, changedFiles = [], forceAll = false }) {
  const workspacePackages = discoverWorkspacePackages(root);
  const affectedPackageNames = selectAffectedPackageNames(workspacePackages, changedFiles, forceAll);
  const runSpf = affectedPackageNames.includes('@videojs/spf');
  const standardPackageNames = affectedPackageNames.filter((name) => !SPECIAL_TEST_PACKAGES.has(name));
  const shards = createPackageTestShards(standardPackageNames);

  return {
    affected: affectedPackageNames,
    hasStandardTests: shards.length > 0,
    matrix: {
      // GitHub validates the matrix before evaluating all job fields. Keep a
      // placeholder for the job-level `if` to skip when no tests are affected.
      include: shards.length > 0 ? shards : [{ name: 'none', packages: [] }],
    },
    runSpf,
  };
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : '';

if (scriptPath === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const forceAll = process.argv.includes('--all');
  const changedFiles = forceAll ? [] : readFileSync(0, 'utf8').split(/\r?\n/);
  const selection = createPackageTestSelection({ root, changedFiles, forceAll });

  process.stdout.write(`${JSON.stringify(selection)}\n`);
}
