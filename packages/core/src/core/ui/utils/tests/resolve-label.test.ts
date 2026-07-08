import { describe, expect, it } from 'vitest';

import { resolveLabel } from '../resolve-label';

describe('resolveLabel', () => {
  it('returns a string label', () => {
    expect(resolveLabel('Play', {})).toBe('Play');
  });

  it('returns a function label', () => {
    expect(resolveLabel((state: { paused: boolean }) => (state.paused ? 'Play' : 'Pause'), { paused: false })).toBe(
      'Pause'
    );
  });

  it('returns undefined for empty labels', () => {
    expect(resolveLabel('', {})).toBeUndefined();
    expect(resolveLabel(() => '', {})).toBeUndefined();
  });
});
