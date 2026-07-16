import { describe, expect, it } from 'vitest';
import { renderText } from '../render-text';

describe('renderText', () => {
  it('renders a keyed text element with its English fallback', () => {
    expect(renderText({ key: 'menu.quality', text: 'Quality' })).toBe(
      '<media-text token="menu.quality">Quality</media-text>'
    );
  });

  it('renders escaped attributes and text', () => {
    expect(renderText({ key: 'menu.quality', text: '<Quality>' }, { 'data-label': 'a&b' })).toBe(
      '<media-text token="menu.quality" data-label="a&amp;b">&lt;Quality&gt;</media-text>'
    );
  });
});
