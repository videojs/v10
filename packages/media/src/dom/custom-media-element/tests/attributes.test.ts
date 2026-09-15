import { describe, expect, it } from 'vite-plus/test';

import { adapterPropsFromAttributes, deriveAdapterAttributes } from '../attributes';

class EmbedAdapter {
  static readonly defaultProps = {
    src: '',
    autoplay: false,
    defaultMuted: false,
    muted: false,
    preload: 'metadata',
    playsInline: true,
    volume: 1,
    source: null,
  };
}

describe('deriveAdapterAttributes', () => {
  it('declares one attribute per primitive default, spelled the WHATWG way, and skips objects, playback state, and booleans that default to true', () => {
    const configs = deriveAdapterAttributes(EmbedAdapter.defaultProps);

    expect(Object.keys(configs).sort()).toEqual(['autoplay', 'defaultMuted', 'preload', 'src']);
    expect(configs.defaultMuted).toEqual({
      type: Boolean,
      attribute: 'muted',
      defaultValue: false,
      linkedProperty: 'muted',
    });
    expect(configs.preload).toEqual({ type: String, attribute: 'preload', defaultValue: 'metadata' });
  });
});

describe('adapterPropsFromAttributes', () => {
  it('reads the present attributes over the defaults, coerced by their default', () => {
    const props = adapterPropsFromAttributes(EmbedAdapter, {
      src: 'https://example.com/x',
      muted: '',
      preload: 'none',
    });

    expect(props).toEqual({
      src: 'https://example.com/x',
      autoplay: false,
      defaultMuted: true,
      muted: true,
      preload: 'none',
      playsInline: true,
      volume: 1,
      source: null,
    });
  });

  it('returns the defaults when nothing is set', () => {
    expect(adapterPropsFromAttributes(EmbedAdapter, {})).toEqual(EmbedAdapter.defaultProps);
  });
});
