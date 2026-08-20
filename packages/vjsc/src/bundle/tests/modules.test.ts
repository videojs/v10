import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createBundleModules } from '../modules';

describe('createBundleModules', () => {
  it('loads modules lazily without caching host-owned results', async () => {
    const load = vi.fn(() => ({ code: 'export const value = 1;', watchFiles: ['/workspace/value.ts'] }));
    const modules = createBundleModules({ modules: [{ id: 'virtual:vjsc/value', load }] });

    await expect(modules.load('virtual:vjsc/value')).resolves.toEqual({
      code: 'export const value = 1;',
      watchFiles: [resolve('/workspace/value.ts')],
    });
    await modules.load('\0virtual:vjsc/value');

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('maps public module IDs to their host identity', () => {
    const modules = createBundleModules({
      modules: [{ id: 'virtual:vjsc/value', load: () => ({ code: '', watchFiles: [] }) }],
      resolveId: () => '/workspace/.vjsc/value.ts',
    });

    expect(modules.resolveId('virtual:vjsc/value')).toBe('/workspace/.vjsc/value.ts');
    expect(modules.publicId('/workspace/.vjsc/value.ts')).toBe('virtual:vjsc/value');
  });

  it('rejects duplicate and non-VJSC module IDs', () => {
    expect(() =>
      createBundleModules({
        modules: [
          { id: 'virtual:vjsc/value', load: () => ({ code: '', watchFiles: [] }) },
          { id: 'virtual:vjsc/value', load: () => ({ code: '', watchFiles: [] }) },
        ],
      })
    ).toThrow('Duplicate VJSC virtual module ID');

    expect(() =>
      createBundleModules({
        modules: [
          // @ts-expect-error Invalid virtual ID is rejected at both the type and runtime boundaries.
          { id: 'virtual:other/value', load: () => ({ code: '', watchFiles: [] }) },
        ],
      })
    ).toThrow('VJSC virtual module IDs must start');
  });
});
