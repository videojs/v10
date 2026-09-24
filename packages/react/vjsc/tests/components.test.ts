import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import coreSchema from '@videojs/core/vjsc';
import { describe, expect, it } from 'vitest';

import { reactComponentModule } from '../components';

const packageDir = resolve(import.meta.dirname, '../..');
const barrel = readFileSync(resolve(packageDir, 'src/index.ts'), 'utf8');
const exportsMap = Object.keys(
  (JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8')) as { exports: object }).exports
);

describe('reactComponentModule', () => {
  it('names a real export for every canonical component', () => {
    const missing = Object.keys(coreSchema.definitions).filter((component) => {
      const module = reactComponentModule(component);

      return module === '@videojs/react'
        ? !new RegExp(`\\b${component}\\b`).test(barrel)
        : !exportsMap.some((pattern) => matchesExport(pattern, module.replace('@videojs/react', '.')));
    });

    expect(missing).toEqual([]);
  });
});

function matchesExport(pattern: string, subpath: string): boolean {
  if (!pattern.includes('*')) return pattern === subpath;

  const [prefix, suffix] = pattern.split('*');

  return subpath.startsWith(prefix!) && subpath.endsWith(suffix!);
}
