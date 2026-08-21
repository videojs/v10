import { describe, expect, it } from 'vitest';
import { isHlsJsMedia } from '../../hls-js';
import { isMuxMedia, MuxMedia } from '..';

describe('isMuxMedia', () => {
  it('recognizes MuxMedia by its own and inherited symbol markers', () => {
    const media = new MuxMedia();

    expect(isMuxMedia(media)).toBe(true);
    expect(isHlsJsMedia(media)).toBe(true);
    expect(isMuxMedia({})).toBe(false);
    expect(isMuxMedia(null)).toBe(false);

    media.destroy();
  });
});
