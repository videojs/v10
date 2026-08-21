import { describe, expect, it } from 'vitest';
import { wistiaAttributes, wistiaMediaOptions } from '../options';

describe('wistiaMediaOptions', () => {
  it('squares the corners Wistia rounds, which are the skin’s to round', () => {
    expect(wistiaMediaOptions({})).toMatchObject({ roundedPlayer: 0 });
  });

  it('spells looping the way Wistia does', () => {
    expect(wistiaMediaOptions({ loop: true })).toMatchObject({ endVideoBehavior: 'loop' });
    expect(wistiaMediaOptions({ loop: false })).toMatchObject({ endVideoBehavior: 'default' });
  });

  it('turns controls into the group of switches Wistia hides its chrome behind', () => {
    expect(wistiaMediaOptions({ controls: true })).toMatchObject({ bigPlayButton: true, playBarControl: true });
    expect(wistiaMediaOptions({ controls: false })).toMatchObject({ bigPlayButton: false, playBarControl: false });
  });

  it('decides the chrome for a media that never mentioned it, since Wistia’s default is to draw it', () => {
    expect(wistiaMediaOptions({})).toMatchObject({ bigPlayButton: false, playBarControl: false });
  });

  it('resolves an empty preload, which is what a bare attribute means and not a word Wistia knows', () => {
    expect(wistiaMediaOptions({ preload: '' })).toMatchObject({ preload: 'metadata' });
    expect(wistiaMediaOptions({ preload: 'none' })).toMatchObject({ preload: 'none' });
  });

  it('leaves out a prop that was never given, rather than overruling Wistia’s own configuration', () => {
    const options = wistiaMediaOptions({});

    expect(options).not.toHaveProperty('poster');
    expect(options).not.toHaveProperty('preload');
    expect(options).not.toHaveProperty('autoplay');
    expect(options).not.toHaveProperty('endVideoBehavior');
  });

  it('keeps the muted state and the source out of it, which are not the player’s configuration', () => {
    const options = wistiaMediaOptions({}) as Record<string, unknown>;

    expect(options).not.toHaveProperty('muted');
    expect(options).not.toHaveProperty('mediaId');
  });
});

describe('wistiaAttributes', () => {
  it('spells an option the way Wistia’s element observes it', () => {
    expect(wistiaAttributes({ mediaId: 'abcde12345', qualityMin: 540 })).toEqual({
      'media-id': 'abcde12345',
      'quality-min': '540',
    });
  });

  it('writes false out in full, since a dropped attribute is Wistia’s default instead', () => {
    expect(wistiaAttributes({ bigPlayButton: false })).toEqual({ 'big-play-button': 'false' });
  });

  it('leaves out an option with no attribute spelling rather than writing nonsense', () => {
    expect(wistiaAttributes({ playerColorGradient: { on: false }, poster: undefined })).toEqual({});
  });
});
