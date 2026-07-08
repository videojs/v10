import { describe, expect, it } from 'vitest';

import { walkAncestors } from '../walk-ancestors';

describe('walkAncestors', () => {
  it('returns undefined for null start', () => {
    expect(walkAncestors(null, () => 'value')).toBeUndefined();
  });

  it('returns the first defined callback value', () => {
    const outer = document.createElement('section');
    const middle = document.createElement('div');
    const inner = document.createElement('span');
    outer.appendChild(middle);
    middle.appendChild(inner);
    document.body.appendChild(outer);

    expect(
      walkAncestors(inner, (node) => {
        if (node === middle) return 'middle';
        if (node === outer) return 'outer';
        return undefined;
      })
    ).toBe('middle');
  });
});
