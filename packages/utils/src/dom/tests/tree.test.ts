import { describe, expect, it } from 'vitest';

import { containsComposed } from '../tree';

describe('tree', () => {
  it('checks composed containment across shadow roots', () => {
    const container = document.createElement('div');
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    shadow.append(button);
    container.append(host);
    document.body.append(container);

    expect(container.contains(button)).toBe(false);
    expect(containsComposed(container, button)).toBe(true);
  });

  it('returns false for elements outside the composed tree', () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    document.body.append(container, button);

    expect(containsComposed(container, button)).toBe(false);
  });
});
