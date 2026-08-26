import { describe, expect, it } from 'vite-plus/test';

import { addInputEntries } from '../input';

describe('addInputEntries', () => {
  it('preserves existing named inputs', () => {
    expect(addInputEntries({ index: './index.ts' }, { schema: './schema.ts' })).toEqual({
      index: './index.ts',
      schema: './schema.ts',
    });
  });

  it('preserves string and array inputs', () => {
    expect(addInputEntries('./index.ts', { schema: './schema.ts' })).toEqual(['./index.ts', './schema.ts']);
    expect(addInputEntries(['./index.ts'], { schema: './schema.ts' })).toEqual(['./index.ts', './schema.ts']);
  });

  it('rejects conflicting named inputs', () => {
    expect(() => addInputEntries({ schema: './existing.ts' }, { schema: './schema.ts' })).toThrow(
      'Input entry already exists: `schema`.'
    );
  });
});
