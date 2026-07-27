import { describe, expect, it } from 'vitest';
import { deepEqual } from '../deep-equal';

describe('deepEqual', () => {
  it('returns true for identical primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for different primitives', () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(0, '0')).toBe(false);
  });

  it('returns true for same reference', () => {
    const obj = { a: { b: 1 } };
    expect(deepEqual(obj, obj)).toBe(true);
  });

  it('compares nested objects structurally', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    expect(deepEqual({ a: { b: 1 } }, { a: { c: 1 } })).toBe(false);
  });

  it('compares arrays structurally', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(deepEqual([], {})).toBe(false);
  });

  it('returns false for objects with different keys', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('treats keys set to undefined as absent', () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: undefined }, {})).toBe(true);
    expect(deepEqual({ a: null }, {})).toBe(false);
  });

  it('handles NaN and signed zero like Object.is', () => {
    expect(deepEqual({ a: NaN }, { a: NaN })).toBe(true);
    expect(deepEqual({ a: 0 }, { a: -0 })).toBe(false);
  });

  it('compares non-plain objects by reference only', () => {
    const date = new Date(0);
    expect(deepEqual(date, date)).toBe(true);
    expect(deepEqual(new Date(0), new Date(0))).toBe(false);
    expect(deepEqual(new Map(), new Map())).toBe(false);
  });

  it('returns false when comparing object to primitive or null', () => {
    expect(deepEqual({ a: 1 }, null)).toBe(false);
    expect(deepEqual({ a: 1 }, 1)).toBe(false);
  });
});
