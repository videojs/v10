import { describe, expect, it } from 'vitest';
import { shallowEqual } from '../shallow-equal';

describe('shallowEqual', () => {
  it('returns true for identical primitives', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('a', 'a')).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for different primitives', () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual('a', 'b')).toBe(false);
    expect(shallowEqual(true, false)).toBe(false);
    expect(shallowEqual(null, undefined)).toBe(false);
  });

  it('returns true for same reference', () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('returns true for objects with same keys and values', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns false for objects with different values', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('returns false for objects with different keys', () => {
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns false for nested objects with different references', () => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
  });

  it('returns true for nested objects with same reference', () => {
    const nested = { b: 1 };
    expect(shallowEqual({ a: nested }, { a: nested })).toBe(true);
  });

  it('handles NaN correctly', () => {
    expect(shallowEqual(NaN, NaN)).toBe(true);
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it('handles +0 and -0', () => {
    expect(shallowEqual(0, -0)).toBe(false);
    expect(shallowEqual({ a: 0 }, { a: -0 })).toBe(false);
  });

  it('returns false when comparing object to null', () => {
    expect(shallowEqual({ a: 1 }, null)).toBe(false);
    expect(shallowEqual(null, { a: 1 })).toBe(false);
  });

  it('returns false when comparing object to primitive', () => {
    expect(shallowEqual({ a: 1 }, 1 as any)).toBe(false);
    expect(shallowEqual(1 as any, { a: 1 })).toBe(false);
  });
});
