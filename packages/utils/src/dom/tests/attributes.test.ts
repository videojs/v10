import { describe, expect, it } from 'vitest';

import { namedNodeMapToObject, serializeAttributes } from '../attributes';

describe('serializeAttributes', () => {
  it('serializes a boolean (empty-string) attribute without a value', () => {
    expect(serializeAttributes({ muted: '' })).toBe(' muted');
  });

  it('serializes a normal value unchanged when no special characters are present', () => {
    expect(serializeAttributes({ preload: 'metadata' })).toBe(' preload="metadata"');
  });

  it('serializes multiple attributes', () => {
    expect(serializeAttributes({ autoplay: '', preload: 'metadata' })).toBe(' autoplay preload="metadata"');
  });

  it('escapes double quotes in attribute values', () => {
    expect(serializeAttributes({ src: '" onerror="alert(1)' })).toBe(' src="&quot; onerror=&quot;alert(1)"');
  });

  it('escapes angle brackets in attribute values', () => {
    expect(serializeAttributes({ src: '"><script>bad</script><video x="' })).toBe(
      ' src="&quot;&gt;&lt;script&gt;bad&lt;/script&gt;&lt;video x=&quot;"'
    );
  });

  it('escapes ampersands in attribute values', () => {
    expect(serializeAttributes({ src: 'a&b' })).toBe(' src="a&amp;b"');
  });

  it('escapes ampersand before other entities to prevent double-encoding', () => {
    // If '&' were escaped after '"', the existing '&quot;' would become '&amp;quot;'
    // which the browser would decode as the literal text '&quot;' instead of '"'.
    // This test ensures the pre-existing entity reference is preserved correctly.
    expect(serializeAttributes({ src: 'x&quot;y' })).toBe(' src="x&amp;quot;y"');
  });

  it('escapes all four special characters together', () => {
    const value = '&"<>';
    expect(serializeAttributes({ src: value })).toBe(' src="&amp;&quot;&lt;&gt;"');
  });

  it('returns an empty string for an empty object', () => {
    expect(serializeAttributes({})).toBe('');
  });
});

describe('namedNodeMapToObject', () => {
  it('copies raw attribute values without escaping', () => {
    const el = document.createElement('div');
    el.setAttribute('src', '"raw"');
    el.setAttribute('muted', '');

    const result = namedNodeMapToObject(el.attributes);

    expect(result.src).toBe('"raw"');
    expect(result.muted).toBe('');
  });

  it('returns an empty object when there are no attributes', () => {
    const el = document.createElement('div');

    expect(namedNodeMapToObject(el.attributes)).toEqual({});
  });
});
