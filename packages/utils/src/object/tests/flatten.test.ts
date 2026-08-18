import { describe, expect, it } from 'vitest';
import { flatten } from '../flatten';

describe('flatten', () => {
  it('flattens nested objects into dot-separated keys', () => {
    expect(
      flatten({
        buttons: { play: 'Play', pause: 'Pause' },
        common: { empty: '' },
      })
    ).toEqual({
      'buttons.play': 'Play',
      'buttons.pause': 'Pause',
      'common.empty': '',
    });
  });

  it('preserves non-object values as leaves', () => {
    expect(flatten({ value: 0, enabled: false, items: ['one'] })).toEqual({
      value: 0,
      enabled: false,
      items: ['one'],
    });
  });

  it('accepts a prefix option', () => {
    expect(flatten({ play: 'Play' }, { prefix: 'buttons' })).toEqual({ 'buttons.play': 'Play' });
  });
});
