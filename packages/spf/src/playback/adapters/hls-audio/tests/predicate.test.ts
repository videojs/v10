import { describe, expect, it } from 'vitest';
import { HlsAudioMedia, isHlsAudioMedia } from '..';

describe('isHlsAudioMedia', () => {
  it('recognizes HlsAudioMedia by its symbol marker', () => {
    const media = new HlsAudioMedia();

    expect(isHlsAudioMedia(media)).toBe(true);
    expect(isHlsAudioMedia({})).toBe(false);
    expect(isHlsAudioMedia(null)).toBe(false);

    media.destroy();
  });
});
