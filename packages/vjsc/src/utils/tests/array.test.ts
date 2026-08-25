import { describe, expect, it } from 'vite-plus/test';

import { toArray } from '../array';

describe('toArray', () => {
  it('wraps scalar values and preserves arrays', () => {
    const values = ['one', 'two'] as const;

    expect(toArray('one')).toEqual(['one']);
    expect(toArray(values)).toBe(values);
  });
});
