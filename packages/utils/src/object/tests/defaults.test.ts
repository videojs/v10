import { describe, expect, it, vi } from 'vite-plus/test';

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

  it('ignores keys absent from the default values', () => {
    const input = { a: 'custom', extra: 'ignored' };
    const result = defaults(input, { a: 'default' });

    expect(result).toEqual({ a: 'custom' });
    expect(result).not.toHaveProperty('extra');
  });

  it('reads default keys from inherited accessors on the input', () => {
    // Mirrors ReactiveElement, which installs reactive properties as enumerable
    // accessors on the class prototype rather than as own properties.
    const proto = {};

    Object.defineProperty(proto, 'delay', { get: () => 900, enumerable: true });

    const input = Object.create(proto) as { delay?: number };

    expect(Object.hasOwn(input, 'delay')).toBe(false);
    expect(defaults(input, { delay: 600, timeout: 400 })).toEqual({ delay: 900, timeout: 400 });
  });

  it('does not read inherited properties absent from the default values', () => {
    const inherited = vi.fn(() => 'inherited');
    const proto = {};

    Object.defineProperty(proto, 'inherited', { get: inherited, enumerable: true });

    const input = Object.create(proto) as { a?: number };

    input.a = 2;

    const result = defaults(input, { a: 1 });

    expect(result).toEqual({ a: 2 });
    expect(inherited).not.toHaveBeenCalled();
  });

  it('reads each default key from the input exactly once', () => {
    const a = vi.fn(() => 2);
    const input = {};

    Object.defineProperty(input, 'a', { get: a, enumerable: true });

    defaults(input as { a?: number }, { a: 1, b: 0 });

    expect(a).toHaveBeenCalledTimes(1);
  });
});
