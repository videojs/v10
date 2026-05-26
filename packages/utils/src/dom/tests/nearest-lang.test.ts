import { afterEach, describe, expect, it } from 'vitest';

import { nearestLang } from '../nearest-lang';

describe('nearestLang', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('lang');
  });

  it('returns undefined for null start', () => {
    expect(nearestLang(null)).toBeUndefined();
  });

  it('reads lang on the start element', () => {
    const el = document.createElement('div');
    el.setAttribute('lang', 'fr');
    document.body.appendChild(el);
    expect(nearestLang(el)).toBe('fr');
  });

  it('walks ancestors and prefers closest lang', () => {
    const outer = document.createElement('section');
    outer.setAttribute('lang', 'de');
    const inner = document.createElement('div');
    inner.setAttribute('lang', 'fr');
    outer.appendChild(inner);
    document.body.appendChild(outer);
    expect(nearestLang(inner)).toBe('fr');
  });

  it('inherits from an ancestor when start has no lang', () => {
    const outer = document.createElement('section');
    outer.setAttribute('lang', 'de');
    const inner = document.createElement('div');
    outer.appendChild(inner);
    document.body.appendChild(outer);
    expect(nearestLang(inner)).toBe('de');
  });

  it('ignores empty lang and continues walking', () => {
    const outer = document.createElement('section');
    outer.setAttribute('lang', 'de');
    const inner = document.createElement('div');
    inner.setAttribute('lang', '  ');
    outer.appendChild(inner);
    document.body.appendChild(outer);
    expect(nearestLang(inner)).toBe('de');
  });

  it('reads lang IDL property on html when set via documentElement.lang', () => {
    document.documentElement.lang = 'fr';
    const inner = document.createElement('div');
    document.body.appendChild(inner);
    expect(nearestLang(inner)).toBe('fr');
  });
});
