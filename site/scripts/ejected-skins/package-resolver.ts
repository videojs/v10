import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type PackageExportTarget = string | Record<string, string>;

interface PackageManifest {
  name: string;
  exports?: Record<string, PackageExportTarget>;
}

interface PackageSpecifierParts {
  packageDir: string;
  packageName: string;
  subpath: string;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, '../../..');
const packagesRoot = resolve(workspaceRoot, 'packages');
const packageManifestCache = new Map<string, PackageManifest>();

function parsePackageSpecifier(specifier: string): PackageSpecifierParts {
  const parts = specifier.split('/');

  if (parts.length < 2 || parts[0] !== '@videojs') {
    throw new Error(`Expected a @videojs package specifier, got "${specifier}"`);
  }

  const packageName = `${parts[0]}/${parts[1]}`;
  const packageDir = resolve(packagesRoot, parts[1]);
  const subpath = parts.length > 2 ? `./${parts.slice(2).join('/')}` : '.';

  return { packageDir, packageName, subpath };
}

function readPackageManifest(packageDir: string): PackageManifest {
  const cached = packageManifestCache.get(packageDir);
  if (cached) return cached;

  const manifestPath = resolve(packageDir, 'package.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing package manifest: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PackageManifest;
  packageManifestCache.set(packageDir, manifest);
  return manifest;
}

function matchExportPattern(pattern: string, subpath: string): string | null {
  if (!pattern.includes('*')) return pattern === subpath ? '' : null;

  const [prefix, suffix] = pattern.split('*');
  if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) return null;
  return subpath.slice(prefix.length, subpath.length - suffix.length);
}

function selectExportTarget(exportTarget: PackageExportTarget, specifier: string, packageName: string): string {
  if (typeof exportTarget === 'string') return exportTarget;

  for (const condition of ['default', 'development', 'import', 'module', 'node', 'types']) {
    const target = exportTarget[condition];
    if (target) return target;
  }

  throw new Error(`Package "${packageName}" exports "${specifier}" but does not provide a supported target condition`);
}

export function resolvePackageExportFile(specifier: string): string {
  const { packageDir, packageName, subpath } = parsePackageSpecifier(specifier);
  const exportsField = readPackageManifest(packageDir).exports;

  if (!exportsField) throw new Error(`Package "${packageName}" does not define exports`);

  const exactTarget = exportsField[subpath];
  if (exactTarget) {
    const target = selectExportTarget(exactTarget, specifier, packageName);
    const filePath = resolve(packageDir, target.replace(/^\.\//, ''));
    if (!existsSync(filePath)) throw new Error(`Resolved file does not exist: ${filePath}`);
    return filePath;
  }

  for (const [pattern, exportTarget] of Object.entries(exportsField)) {
    const wildcardValue = matchExportPattern(pattern, subpath);
    if (wildcardValue === null) continue;

    const targetPattern = selectExportTarget(exportTarget, specifier, packageName);
    const filePath = resolve(packageDir, targetPattern.replace('*', wildcardValue).replace(/^\.\//, ''));
    if (!existsSync(filePath)) throw new Error(`Resolved file does not exist: ${filePath}`);
    return filePath;
  }

  throw new Error(`Package "${packageName}" does not export "${subpath}"`);
}

export function pkgDistUrl(specifier: string): string {
  return pathToFileURL(resolvePackageExportFile(specifier)).href;
}

export function validatePackageImports(source: string, sourcePath: string): void {
  const specifiers = new Set<string>();
  const importRegex = /from\s+['"](@videojs\/[^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(source)) !== null) specifiers.add(match[1]);

  for (const specifier of specifiers) {
    try {
      resolvePackageExportFile(specifier);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid package import "${specifier}" in "${sourcePath}": ${message}`);
    }
  }
}

export function toRepoPath(filePath: string): string {
  return relative(workspaceRoot, filePath);
}
