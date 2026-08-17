import { basename, relative, resolve } from 'node:path';

import type { ResolvedTarget, SourceTargetContext } from '@videojs/compiler';
import {
  collectClassDeclarations,
  collectModuleReferences,
  findClassDeclaration,
  readStaticStringProperty,
} from '@videojs/compiler/ast';

const packageDir = resolve(import.meta.dirname, '..');
const elementSuffix = 'Element';

export function resolveHtmlTargets({ fileName, sourceFile, resolveModule }: SourceTargetContext): ResolvedTarget[] {
  const defineFile = relative(packageDir, fileName);
  if (defineFile.endsWith('/compounds.ts')) return [];

  const source = publicModule(defineFile);
  const targets: ResolvedTarget[] = [];

  for (const declaration of collectClassDeclarations(sourceFile)) {
    const name = declaration.name?.text;
    const tagName = readStaticStringProperty(declaration, 'tagName');

    if (name?.endsWith(elementSuffix) && tagName) {
      targets.push(createTarget(defineFile, source, name, tagName));
    }
  }

  for (const reference of collectModuleReferences(sourceFile)) {
    const imported = resolveModule(reference.source);
    if (!imported) continue;

    for (const name of reference.names) {
      if (!name.endsWith(elementSuffix)) continue;

      const declaration = findClassDeclaration(imported.sourceFile, name);
      const tagName = declaration && readStaticStringProperty(declaration, 'tagName');

      if (tagName) targets.push(createTarget(defineFile, source, name, tagName));
    }
  }

  return targets;
}

function createTarget(defineFile: string, source: string, className: string, tagName: string): ResolvedTarget {
  const name = className.slice(0, -elementSuffix.length);

  return {
    name,
    priority: targetPriority(defineFile, name),
    target: {
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

function targetPriority(defineFile: string, name: string): number {
  const moduleName = basename(defineFile, '.ts');
  const targetName = kebabCase(name);

  if (moduleName === targetName) return 2;
  return targetName.startsWith(`${moduleName}-`) ? 1 : 0;
}
