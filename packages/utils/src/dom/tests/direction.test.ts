import { afterEach, describe, expect, it } from 'vitest';

import { isRTL } from '../direction';

describe('isRTL', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('dir');
  });

  it('returns false for default LTR element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    expect(isRTL(el)).toBe(false);
  });

  it('returns true when ancestor has dir="rtl"', () => {
    const parent = document.createElement('div');
    parent.setAttribute('dir', 'rtl');
    const child = document.createElement('div');
    parent.appendChild(child);
    document.body.appendChild(parent);

    expect(isRTL(child)).toBe(true);
  });

  it('returns true when element has dir="rtl"', () => {
    const el = document.createElement('div');
    el.setAttribute('dir', 'rtl');
    document.body.appendChild(el);

    expect(isRTL(el)).toBe(true);
  });
});
