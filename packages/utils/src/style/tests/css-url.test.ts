import { describe, expect, it } from 'vitest';
import { cssUrl } from '../css-url';

describe('cssUrl', () => {
  it('quotes the URL', () => {
    expect(cssUrl('poster.jpg')).toBe('url("poster.jpg")');
  });

  it('survives a URL carrying parens', () => {
    expect(cssUrl('poster(1).jpg')).toBe('url("poster(1).jpg")');
  });

  it('escapes quotes and backslashes so they cannot close the string early', () => {
    expect(cssUrl('a"b\\c')).toBe('url("a\\"b\\\\c")');
  });
});
