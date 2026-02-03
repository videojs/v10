import { describe, expect, it } from 'vitest';

import { defaults } from '../defaults';

describe('defaults', () => {
  it('fills undefined values with defaults', () => {
    const result = defaults({ a: undefined, b: 2 }, { a: 1, b: 0 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('preserves defined values', () => {
    const result = defaults({ a: 'custom', b: 'also custom' }, { a: 'default', b: 'default' });
    expect(result).toEqual({ a: 'custom', b: 'also custom' });
  });

  it('returns all defaults for empty object', () => {
    const result = defaults({}, { a: 1, b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('preserves falsy values (false)', () => {
    const result = defaults({ enabled: false }, { enabled: true });
    expect(result).toEqual({ enabled: false });
  });

  it('preserves falsy values (0)', () => {
    const result = defaults({ count: 0 }, { count: 10 });
    expect(result).toEqual({ count: 0 });
  });

  it('preserves falsy values (empty string)', () => {
    const result = defaults({ label: '' }, { label: 'default' });
    expect(result).toEqual({ label: '' });
  });

  it('preserves null values', () => {
    const result = defaults<{ value: string | null }>({ value: null }, { value: 'default' });
    expect(result).toEqual({ value: null });
  });

  it('handles mixed defined and undefined values', () => {
    const result = defaults({ label: 'custom', disabled: undefined }, { label: 'default', disabled: false });
    expect(result).toEqual({ label: 'custom', disabled: false });
  });

  it('does not mutate the input object', () => {
    const input = { a: undefined };
    const defaultValues = { a: 1, b: 2 };

    defaults(input, defaultValues);

    expect(input).toEqual({ a: undefined });
    expect(defaultValues).toEqual({ a: 1, b: 2 });
  });

  it('does not mutate the default values object', () => {
    const input = { a: 'custom' };
    const defaultValues = { a: 'default', b: 'default' };

    const result = defaults(input, defaultValues);

    expect(defaultValues).toEqual({ a: 'default', b: 'default' });
    expect(result).not.toBe(defaultValues);
  });

  it('handles nested objects (shallow)', () => {
    const nested = { x: 1 };
    const result = defaults({ config: undefined }, { config: nested });

    expect(result.config).toBe(nested);
  });
});
