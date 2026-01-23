import { describe, expect, it } from 'vitest';

import { uniqBy } from '../uniq-by';

describe('uniqBy', () => {
  it('removes duplicates keeping last occurrence', () => {
    const arr = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'a', v: 3 },
    ];

    const result = uniqBy(arr, (item) => item.id);

    expect(result).toEqual([
      { id: 'b', v: 2 },
      { id: 'a', v: 3 },
    ]);
  });

  it('returns empty array for empty input', () => {
    const result = uniqBy([], (item) => item);
    expect(result).toEqual([]);
  });

  it('returns same array when no duplicates', () => {
    const arr = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    const result = uniqBy(arr, (item) => item.id);

    expect(result).toEqual(arr);
  });

  it('works with primitive values', () => {
    const arr = [1, 2, 3, 2, 1];

    const result = uniqBy(arr, (item) => item);

    expect(result).toEqual([3, 2, 1]);
  });

  it('preserves order with last occurrence winning', () => {
    const arr = [
      { id: 'x', order: 1 },
      { id: 'y', order: 2 },
      { id: 'z', order: 3 },
      { id: 'x', order: 4 },
      { id: 'y', order: 5 },
    ];

    const result = uniqBy(arr, (item) => item.id);

    expect(result).toEqual([
      { id: 'z', order: 3 },
      { id: 'x', order: 4 },
      { id: 'y', order: 5 },
    ]);
  });
});
