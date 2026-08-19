import { basename, relative, resolve } from 'node:path';

import type { ResolvedEntry, SourceEntryContext } from 'vjsc';
import {
  collectClassDeclarations,
  collectModuleReferences,
  findClassDeclaration,
  readStaticStringProperty,
} from 'vjsc/ast';

const packageDir = resolve(import.meta.dirname, '..');
const elementSuffix = 'Element';

export function resolveHtmlEntries({ fileName, sourceFile, resolveModule }: SourceEntryContext): ResolvedEntry[] {
  const defineFile = relative(packageDir, fileName);
  if (defineFile.endsWith('/compounds.ts')) return [];

  const source = publicModule(defineFile);
  const entries: ResolvedEntry[] = [];

  for (const declaration of collectClassDeclarations(sourceFile)) {
    const name = declaration.name?.text;
    const tagName = readStaticStringProperty(declaration, 'tagName');

    if (name?.endsWith(elementSuffix) && tagName) {
      entries.push(createEntry(defineFile, source, name, tagName));
    }
  }

  for (const reference of collectModuleReferences(sourceFile)) {
    const imported = resolveModule(reference.source);
    if (!imported) continue;

    for (const name of reference.names) {
      if (!name.endsWith(elementSuffix)) continue;

      const declaration = findClassDeclaration(imported.sourceFile, name);
      const tagName = declaration && readStaticStringProperty(declaration, 'tagName');

      if (tagName) entries.push(createEntry(defineFile, source, name, tagName));
    }
  }

  return entries;
}

function createEntry(defineFile: string, source: string, className: string, tagName: string): ResolvedEntry {
  const name = className.slice(0, -elementSuffix.length);

  return {
    name,
    priority: entryPriority(defineFile, name),
    entry: {
      tagName,
      import: { from: source, sideEffect: true },
    },
  };
}

function publicModule(defineFile: string): string {
  if (defineFile === 'src/define/i18n.ts') return '@videojs/html/i18n';

  return `@videojs/html/${defineFile.replace(/^src\/define\//, '').replace(/\.ts$/, '')}`;
}

function kebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function entryPriority(defineFile: string, name: string): number {
  const moduleName = basename(defineFile, '.ts');
  const entryName = kebabCase(name);

  if (moduleName === entryName) return 2;
  return entryName.startsWith(`${moduleName}-`) ? 1 : 0;
}
