import { describe, expect, it } from 'vitest';

import { resolveOptionalControlLabel } from '../resolve-optional-control-label';

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
