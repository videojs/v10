import { describe, expect, it } from 'vite-plus/test';

import { toValue } from '../to-value';

describe('toValue', () => {
  it('returns a plain value as is', () => {
    expect(toValue('a')).toBe('a');
    expect(toValue(0)).toBe(0);
    expect(toValue(undefined)).toBeUndefined();
  });

  it('calls a function and returns its result', () => {
    let current = 'first';
    const read = () => current;

    expect(toValue(read)).toBe('first');

    current = 'second';
    expect(toValue(read)).toBe('second');
  });

  it('answers undefined when the function throws', () => {
    expect(
      toValue(() => {
        throw new Error('boom');
      })
    ).toBeUndefined();
  });
});
