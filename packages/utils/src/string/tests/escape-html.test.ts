import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../escape-html';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('&<>"\'`')).toBe('&amp;&lt;&gt;&quot;&#39;&#96;');
  });

  it('preserves strings without HTML special characters', () => {
    expect(escapeHtml('https://example.com/video/123?autoplay=1')).toBe('https://example.com/video/123?autoplay=1');
  });

  it('escapes ampersand first to avoid double-encoding', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    expect(escapeHtml('https://player.vimeo.com/video/123?autoplay=1')).toBe(
      'https://player.vimeo.com/video/123?autoplay=1'
    );
  });
});
