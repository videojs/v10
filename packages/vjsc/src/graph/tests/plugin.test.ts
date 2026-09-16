import { describe, expect, it } from 'vite-plus/test';

import { findGraph } from '../plugin';
import type { Graph } from '../types';

describe('findGraph', () => {
  it('locates the VJSC graph through a host plugin list', () => {
    const graph = {
      root: '/project',
      modules: new Map(),
      assets: new Map(),
    } satisfies Graph;

    expect(findGraph([null, 'plugin', { name: 'other' }, { name: 'vjsc', api: graph }])).toBe(graph);
  });
});
