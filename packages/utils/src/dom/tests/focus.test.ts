import { describe, expect, it } from 'vitest';

import { getDeepActiveElement } from '../focus';

describe('focus', () => {
  it('gets the active element inside open shadow roots', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    shadow.append(button);
    document.body.append(host);

    button.focus();

    expect(document.activeElement).toBe(host);
    expect(getDeepActiveElement()).toBe(button);
  });
});
