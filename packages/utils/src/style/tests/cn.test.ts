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
});
