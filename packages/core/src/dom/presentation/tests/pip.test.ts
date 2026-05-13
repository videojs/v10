import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isPictureInPictureEnabled } from '../pip';

describe('isPictureInPictureEnabled', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      pictureInPictureEnabled: true,
      pictureInPictureElement: null,
      createElement: () => ({}),
    });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0' });
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true on Firefox when document.pictureInPictureEnabled is true', () => {
    expect(isPictureInPictureEnabled()).toBe(true);
  });

  it('returns false when media has isPipCapable set to false', () => {
    const media = Object.assign(new EventTarget(), { isPipCapable: false });
    expect(isPictureInPictureEnabled(media)).toBe(false);
  });

  it('returns true when media has isPipCapable set to true', () => {
    const media = Object.assign(new EventTarget(), { isPipCapable: true });
    expect(isPictureInPictureEnabled(media)).toBe(true);
  });

  it('returns true when media does not have isPipCapable (standard HTMLVideoElement)', () => {
    const media = new EventTarget();
    expect(isPictureInPictureEnabled(media)).toBe(true);
  });
});
