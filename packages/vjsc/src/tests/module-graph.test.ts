import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createVirtualModuleGraph } from '../module-graph';

describe('createVirtualModuleGraph', () => {
  it('loads modules lazily and caches them until a watched input changes', async () => {
    const load = vi.fn(() => ({ code: 'export const value = 1;', watchFiles: ['/workspace/value.ts'] }));
    const graph = createVirtualModuleGraph([{ id: 'virtual:vjsc/value', load }]);

    await expect(graph.load('virtual:vjsc/value')).resolves.toEqual({
      code: 'export const value = 1;',
      watchFiles: [resolve('/workspace/value.ts')],
    });
    await graph.load('\0virtual:vjsc/value');
    expect(load).toHaveBeenCalledTimes(1);

    expect(graph.invalidate('/workspace/value.ts')).toEqual(['virtual:vjsc/value']);
    await graph.load('virtual:vjsc/value');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('updates reverse watch relationships after regeneration', async () => {
    let watchFiles = ['/workspace/first.ts'];
    const graph = createVirtualModuleGraph([{ id: 'virtual:vjsc/value', load: () => ({ code: '', watchFiles }) }]);

    await graph.load('virtual:vjsc/value');
    graph.invalidate('/workspace/first.ts');
    watchFiles = ['/workspace/second.ts'];
    await graph.load('virtual:vjsc/value');

    expect(graph.invalidate('/workspace/first.ts')).toEqual([]);
    expect(graph.invalidate('/workspace/second.ts')).toEqual(['virtual:vjsc/value']);
  });

  it('rejects duplicate and non-VJSC module IDs', () => {
    expect(() =>
      createVirtualModuleGraph([
        { id: 'virtual:vjsc/value', load: () => ({ code: '', watchFiles: [] }) },
        { id: 'virtual:vjsc/value', load: () => ({ code: '', watchFiles: [] }) },
      ])
    ).toThrow('Duplicate VJSC virtual module ID');

    expect(() =>
      createVirtualModuleGraph([
        // @ts-expect-error Invalid virtual ID is rejected at both the type and runtime boundaries.
        { id: 'virtual:other/value', load: () => ({ code: '', watchFiles: [] }) },
      ])
    ).toThrow('VJSC virtual module IDs must start');
  });
});
