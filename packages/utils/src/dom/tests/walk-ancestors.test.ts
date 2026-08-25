import { describe, expect, it } from 'vite-plus/test';

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

  it('walks assigned slots and shadow hosts in composed mode', () => {
    const outer = document.createElement('section');
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    const slot = document.createElement('slot');
    const inner = document.createElement('span');

    wrapper.append(slot);
    shadow.append(wrapper);
    host.append(inner);
    outer.append(host);
    document.body.append(outer);

    const visited: Element[] = [];

    walkAncestors(
      inner,
      (node) => {
        visited.push(node);
        return undefined;
      },
      { composed: true }
    );

    expect(visited).toEqual([inner, slot, wrapper, host, outer, document.body, document.documentElement]);
  });
});
