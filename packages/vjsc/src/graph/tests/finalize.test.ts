import { resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { finalizeGraph, type GraphModuleInput } from '../finalize';

describe('finalizeGraph', () => {
  it('normalizes source paths while finalizing a graph', () => {
    const root = resolve('/project');
    const module = fixtureModule(root, 'export const value = 1;');
    const graph = finalizeGraph(root, [module], new Map());

    expect(graph.modules.get(module.id)?.sourcePath).toBe('root.ts');
  });

  it('rejects module metadata left in transformed source', () => {
    const root = resolve('/project');

    expect(() =>
      finalizeGraph(root, [fixtureModule(root, `export const meta = { name: 'root' };`)], new Map())
    ).toThrow('Module metadata remains in transformed source');
  });

  it('trusts the metadata pass instead of re-parsing when it recorded the removal', () => {
    const root = resolve('/project');
    const module = fixtureModule(root, `export const meta = { name: 'root' };`, { metaRemoved: true });
    const graph = finalizeGraph(root, [module], new Map());

    expect(graph.modules.get(module.id)).not.toHaveProperty('metaRemoved');
  });
});

function fixtureModule(root: string, source: string, extra: Partial<GraphModuleInput> = {}): GraphModuleInput {
  const filename = resolve(root, 'root.ts');

  return {
    id: filename,
    filename,
    params: {},
    source,
    imports: [],
    styles: { files: [], assets: [] },
    ...extra,
  };
}
