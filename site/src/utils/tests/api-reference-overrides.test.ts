import { describe, expect, it } from 'vitest';
import { resolveComponentSlug, resolveMediaSlug } from '../api-reference-overrides';

describe('resolveComponentSlug', () => {
  it('kebab-cases names without an override', () => {
    expect(resolveComponentSlug('PlayButton')).toBe('play-button');
    expect(resolveComponentSlug('VolumeSlider')).toBe('volume-slider');
  });

  it('uses the inverted NAME_OVERRIDES map for special casing', () => {
    // kebabCase('PiPButton') would be 'pi-p-button'; the override maps it back.
    expect(resolveComponentSlug('PiPButton')).toBe('pip-button');
    // kebabCase('AirPlayButton') would be 'air-play-button'.
    expect(resolveComponentSlug('AirPlayButton')).toBe('airplay-button');
  });
});

describe('resolveMediaSlug', () => {
  it('kebab-cases names without an override', () => {
    expect(resolveMediaSlug('MuxVideo')).toBe('mux-video');
    expect(resolveMediaSlug('SimpleHlsVideo')).toBe('simple-hls-video');
  });

  it('uses MEDIA_SLUG_OVERRIDES for tag names that differ from kebab-case', () => {
    // kebabCase('HlsJsVideo') would be 'hls-js-video'; the tag name is 'hlsjs-video'.
    expect(resolveMediaSlug('HlsJsVideo')).toBe('hlsjs-video');
  });
});
