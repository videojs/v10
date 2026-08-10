/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const menuDirectory = resolve(dirname(new URL(import.meta.url).pathname), '..');
const sourceDirectory = resolve(menuDirectory, '../..');
const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;

function collectImportSpecifiers(source: string): string[] {
  return [...source.matchAll(importPattern)].flatMap((match) => (match[1] ? [match[1]] : []));
}

function resolveImport(importer: string, specifier: string): string | null {
  const base = resolve(dirname(importer), specifier);

  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts'), resolve(base, 'index.tsx')]) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

function collectMenuGraph(entry: string): string[] {
  const graph = new Set<string>();
  const pending = [entry];

  while (pending.length > 0) {
    const module = pending.pop();
    if (!module || graph.has(module)) continue;

    graph.add(module);
    const source = readFileSync(module, 'utf8');

    for (const specifier of collectImportSpecifiers(source)) {
      graph.add(`${module} -> ${specifier}`);
      if (!specifier.startsWith('.')) continue;

      const dependency = resolveImport(module, specifier);
      if (!dependency) continue;

      graph.add(dependency);
      if (dependency.startsWith(sourceDirectory)) pending.push(dependency);
    }
  }

  return [...graph];
}

describe('React base menu module graph', () => {
  it('tracks bare package imports', () => {
    expect(collectImportSpecifiers("import { translate } from '@videojs/core/i18n';")).toEqual(['@videojs/core/i18n']);
  });

  it('does not depend on settings or i18n modules', () => {
    const graph = collectMenuGraph(resolve(menuDirectory, 'index.parts.ts'));

    expect(graph.filter((module) => /(?:setting|[\\/]i18n[\\/])/.test(module))).toEqual([]);
  });
});
