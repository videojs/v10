import { describe, expect, it } from 'vitest';
import { resolveReferenceSlug } from '../api-reference-overrides';

describe('resolveReferenceSlug', () => {
  it('kebab-cases names without an override', () => {
    expect(resolveReferenceSlug('PlayButton')).toBe('play-button');
    expect(resolveReferenceSlug('VolumeSlider')).toBe('volume-slider');
    expect(resolveReferenceSlug('SimpleHlsVideo')).toBe('simple-hls-video');
  });

  it('uses the inverted NAME_OVERRIDES map for special casing', () => {
    // kebabCase('PiPButton') would be 'pi-p-button'; the override maps it back.
    expect(resolveReferenceSlug('PiPButton')).toBe('pip-button');
    // kebabCase('AirPlayButton') would be 'air-play-button'.
    expect(resolveReferenceSlug('AirPlayButton')).toBe('airplay-button');
    // kebabCase('HlsJsVideo') would be 'hls-js-video'; the tag name is 'hlsjs-video'.
    expect(resolveReferenceSlug('HlsJsVideo')).toBe('hlsjs-video');
  });
});
