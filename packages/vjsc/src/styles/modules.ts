import { existsSync, realpathSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

import type { StyleManifest } from './manifest';

export function isStyleModulePath(path: string): boolean {
  return /\.styles(?:\.[cm]?[jt]sx?)?$/.test(path);
}

export function resolveStyleModuleFile(importer: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;

  const file = resolveSourceModule(importer, specifier);

  return file && isStyleModulePath(file) ? file : undefined;
}

export function resolveManifestStyleModule(
  importer: string,
  specifier: string,
  manifest: StyleManifest
): string | undefined {
  if (!specifier.startsWith('.')) return undefined;

  const file = resolveStyleModuleFile(importer, specifier);

  if (file) {
    const modulePath = realpathSync(file);
    if (manifest.modules.has(modulePath)) return modulePath;
  }

  const imported = resolve(dirname(importer), specifier);

  for (const modulePath of manifest.modules.keys()) {
    if (modulePath === imported || stripScriptExtension(modulePath) === imported) return modulePath;
  }

  return undefined;
}

const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
const sourceExtensionSet = new Set<string>(sourceExtensions);

function resolveSourceModule(importer: string, specifier: string): string | undefined {
  const candidate = resolve(dirname(importer), specifier);
  if (sourceExtensionSet.has(extname(candidate)) && existsSync(candidate)) return candidate;

  for (const extension of sourceExtensions) {
    const filename = `${candidate}${extension}`;
    if (existsSync(filename)) return filename;
  }

  for (const extension of sourceExtensions) {
    const filename = resolve(candidate, `index${extension}`);
    if (existsSync(filename)) return filename;
  }

  return undefined;
}

function stripScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?[jt]s|[jt]sx)$/, '');
}
