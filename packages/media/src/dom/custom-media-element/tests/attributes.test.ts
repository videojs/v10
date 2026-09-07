import { describe, expect, it } from 'vite-plus/test';

import { derivedAttributes, propsFromAttributes } from '../attributes';

class EmbedAdapter {
  static readonly defaultProps = {
    src: '',
    autoplay: false,
    defaultMuted: false,
    muted: false,
    preload: 'metadata',
    volume: 1,
    source: null,
  };
}

describe('derivedAttributes', () => {
  it('declares one attribute per primitive default, spelled the WHATWG way, and skips objects and playback state', () => {
    const configs = derivedAttributes(EmbedAdapter.defaultProps);

    expect(Object.keys(configs).sort()).toEqual(['autoplay', 'defaultMuted', 'preload', 'src']);
    expect(configs.defaultMuted).toEqual({ type: Boolean, attribute: 'muted', empty: false });
    expect(configs.preload).toEqual({ type: String, attribute: 'preload', empty: 'metadata' });
  });
});

describe('propsFromAttributes', () => {
  it('reads the present attributes over the defaults, coerced by their default', () => {
    const props = propsFromAttributes(EmbedAdapter, { src: 'https://example.com/x', muted: '', preload: 'none' });

    expect(props).toEqual({
      src: 'https://example.com/x',
      autoplay: false,
      defaultMuted: true,
      muted: false,
      preload: 'none',
      volume: 1,
      source: null,
    });
  });

  it('returns the defaults when nothing is set', () => {
    expect(propsFromAttributes(EmbedAdapter, {})).toEqual(EmbedAdapter.defaultProps);
  });
});
