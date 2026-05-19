import { describe, expect, it } from 'vitest';

import { createOptionalControlLabelCache, resolveOptionalControlLabel } from '../resolve-optional-control-label';

describe('resolveOptionalControlLabel', () => {
  const state = { x: 1 as const };

  it('returns undefined when label is missing', () => {
    expect(resolveOptionalControlLabel(undefined, state)).toBeUndefined();
  });

  it('returns undefined for empty string label', () => {
    expect(resolveOptionalControlLabel('', state)).toBeUndefined();
  });

  it('returns string label when set', () => {
    expect(resolveOptionalControlLabel('Custom', state)).toBe('Custom');
  });

  it('returns callback result when truthy', () => {
    expect(resolveOptionalControlLabel(() => 'From state', state)).toBe('From state');
    expect(resolveOptionalControlLabel((s) => `x=${s.x}`, state)).toBe('x=1');
  });

  it('returns undefined when callback returns empty string', () => {
    expect(resolveOptionalControlLabel(() => '', state)).toBeUndefined();
  });
});

describe('createOptionalControlLabelCache', () => {
  const state = { x: 1 as const };

  it('reuses resolution for the same state snapshot', () => {
    let calls = 0;
    const cache = createOptionalControlLabelCache<typeof state>();
    const label = () => {
      calls += 1;
      return calls === 1 ? 'first' : '';
    };

    expect(cache.resolve(label, state)).toBe('first');
    expect(cache.resolve(label, state)).toBe('first');
    expect(calls).toBe(1);
  });

  it('invalidates cached resolution', () => {
    const cache = createOptionalControlLabelCache<typeof state>();

    expect(cache.resolve('A', state)).toBe('A');
    cache.invalidate();
    expect(cache.resolve('B', state)).toBe('B');
  });

  it('re-resolves when label changes for the same state snapshot', () => {
    const cache = createOptionalControlLabelCache<typeof state>();

    expect(cache.resolve('A', state)).toBe('A');
    expect(cache.resolve('B', state)).toBe('B');
  });
});
