import { existsSync } from 'node:fs';
import { dirname, extname, posix, resolve } from 'node:path';

import ts from 'typescript';

const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
const sourceExtensionSet = new Set<string>(sourceExtensions);

export function sourceScriptKind(fileName: string): ts.ScriptKind {
  switch (extname(fileName)) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

export function resolveSourceModule(importer: string, specifier: string): string | undefined {
  const candidate = resolve(dirname(importer), specifier);

  if (sourceExtensionSet.has(extname(candidate)) && existsSync(candidate)) return candidate;

  for (const extension of sourceExtensions) {
    const fileName = `${candidate}${extension}`;

    if (existsSync(fileName)) return fileName;
  }

  for (const extension of sourceExtensions) {
    const fileName = resolve(candidate, `index${extension}`);

    if (existsSync(fileName)) return fileName;
  }

  return undefined;
}

export function relativeModuleSpecifier(from: string, to: string): string {
  const path = posix.relative(from, stripScriptExtension(to));

  return path.startsWith('.') ? path : `./${path}`;
}

export function stripScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?[jt]s|[jt]sx)$/, '');
}
