import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { resolveSourceModule, stripScriptExtension } from '../utils/source-module';

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
