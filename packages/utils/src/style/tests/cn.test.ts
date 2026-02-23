import { describe, expect, it } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('returns an empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns a single class name', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('joins multiple class names with a space', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('filters out undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('handles all undefined values', () => {
    expect(cn(undefined, undefined)).toBe('');
  });

  it('filters out empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('preserves class names with multiple words', () => {
    expect(cn('foo bar', 'baz')).toBe('foo bar baz');
  });

  it('includes keys with truthy values from an object', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('includes keys for any truthy value', () => {
    expect(cn({ a: 1, b: 'yes', c: 0, d: '', e: null, f: undefined, g: true })).toBe('a b g');
  });

  it('handles an empty object', () => {
    expect(cn({})).toBe('');
  });

  it('handles an object where all values are falsy', () => {
    expect(cn({ foo: false, bar: 0, baz: '' })).toBe('');
  });

  it('mixes strings and objects', () => {
    expect(cn('foo', { bar: true, baz: false }, 'qux')).toBe('foo bar qux');
  });

  it('handles multiple objects', () => {
    expect(cn({ a: true }, { b: true, c: false })).toBe('a b');
  });

  it('mixes strings, objects, and undefined', () => {
    expect(cn('foo', undefined, { bar: true }, '', { baz: false })).toBe('foo bar');
  });
});
