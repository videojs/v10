import { resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import type { ComponentGraph, ComponentGraphModule } from '../types';
import { validateComponentGraph } from '../validate';

describe('validateComponentGraph', () => {
  it('reuses validation for a finalized graph', () => {
    const graph = fixtureGraph('export const value = 1;');

    expect(validateComponentGraph(graph)).toBe(validateComponentGraph(graph));
  });

  it('rejects component metadata left in transformed source', () => {
    const graph = fixtureGraph(`export const meta = { name: 'root' };`);

    expect(() => validateComponentGraph(graph)).toThrow('Component metadata remains in transformed source');
  });
});

function fixtureGraph(source: string): ComponentGraph {
  const root = resolve('/project');
  const module: ComponentGraphModule = {
    id: resolve(root, 'root.ts'),
    filename: resolve(root, 'root.ts'),
    transform: {},
    source,
    imports: [],
  };

  return {
    root,
    modules: new Map([[module.id, module]]),
    assets: new Map(),
    styles: new Map(),
  };
}
