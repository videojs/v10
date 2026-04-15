import { describe, expect, it } from 'vitest';
import { MuxVideoMedia } from '../browser';

describe('MuxVideoMedia', () => {
  it('accepts src directly', () => {
    const media = new MuxVideoMedia();
    media.src = 'https://stream.mux.com/abc123.m3u8';

    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('accepts non-Mux src', () => {
    const media = new MuxVideoMedia();
    media.src = 'https://example.com/video.m3u8';

    expect(media.src).toBe('https://example.com/video.m3u8');
  });

  it('defaults PLAYER_SOFTWARE_NAME to mux-video', () => {
    expect(MuxVideoMedia.PLAYER_SOFTWARE_NAME).toBe('mux-video');
  });
});
