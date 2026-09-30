import { describe, expect, it } from 'vite-plus/test';

import { RAW_MEDIA, unwrapMedia } from '../unwrap-media';

describe('unwrapMedia', () => {
  it('returns the media a facade answers for the raw key', () => {
    const raw = { paused: true };
    const facade = { [RAW_MEDIA]: raw };

    expect(unwrapMedia(facade)).toBe(raw);
  });

  it('returns anything else as is', () => {
    const media = { paused: true };

    expect(unwrapMedia(media)).toBe(media);
    expect(unwrapMedia(null)).toBeNull();
    expect(unwrapMedia(undefined)).toBeUndefined();
  });

  it('uses a registry symbol so separate package copies agree on the key', () => {
    expect(RAW_MEDIA).toBe(Symbol.for('@videojs/media/raw'));
  });
});
