import { describe, expect, it, vi } from 'vitest';
import { HTMLVideoElementHost } from '../html-video-element-host';

function createHost() {
  const host = new HTMLVideoElementHost();
  const video = document.createElement('video');
  host.target = video;
  return { host, video };
}

describe('HTMLMediaElementLayer source accessors', () => {
  describe('crossOrigin', () => {
    it('returns null when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.crossOrigin).toBeNull();
    });

    it('reads and writes through the chain', () => {
      const { host, video } = createHost();

      host.crossOrigin = 'anonymous';
      expect(video.crossOrigin).toBe('anonymous');
      expect(host.crossOrigin).toBe('anonymous');

      host.crossOrigin = null;
      expect(video.crossOrigin).toBeNull();
    });
  });

  describe('canPlayType', () => {
    it("returns '' when no target is attached", () => {
      const host = new HTMLVideoElementHost();
      expect(host.canPlayType('video/mp4')).toBe('');
    });

    it('delegates to the target', () => {
      const { host, video } = createHost();
      // jsdom typically returns '' but the call should still delegate.
      expect(host.canPlayType('video/mp4')).toBe(video.canPlayType('video/mp4'));
    });
  });
});

describe('HTMLMediaElementLayer playback rate', () => {
  describe('defaultPlaybackRate', () => {
    it('returns 1 when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.defaultPlaybackRate).toBe(1);
    });

    it('reads and writes through the chain', () => {
      const { host, video } = createHost();

      host.defaultPlaybackRate = 2;
      expect(video.defaultPlaybackRate).toBe(2);
      expect(host.defaultPlaybackRate).toBe(2);
    });
  });
});

describe('HTMLMediaElementLayer played', () => {
  it('returns empty TimeRanges when no target is attached', () => {
    const host = new HTMLVideoElementHost();
    expect(host.played.length).toBe(0);
  });

  it('reads through the chain', () => {
    const { host, video } = createHost();
    expect(host.played).toBe(video.played);
  });
});

describe('HTMLMediaElementLayer text tracks', () => {
  describe('addTextTrack', () => {
    it('returns undefined when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.addTextTrack('subtitles', 'English', 'en')).toBeUndefined();
    });

    it('delegates to the target', () => {
      const { host, video } = createHost();
      // jsdom does not implement addTextTrack — stub it to verify delegation.
      const stub = vi.fn((kind: string, label?: string, language?: string) => ({
        kind,
        label,
        language,
      }));
      Object.defineProperty(video, 'addTextTrack', { value: stub, configurable: true });

      const track = host.addTextTrack('captions', 'Captions', 'en') as unknown as { kind: string };
      expect(stub).toHaveBeenCalledWith('captions', 'Captions', 'en');
      expect(track.kind).toBe('captions');
    });
  });
});

describe('HTMLVideoElementHost video dimensions', () => {
  describe('width / height', () => {
    it('returns 0 when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.width).toBe(0);
      expect(host.height).toBe(0);
    });

    it('reads and writes through the target', () => {
      const { host, video } = createHost();

      host.width = 640;
      host.height = 360;
      expect(video.width).toBe(640);
      expect(video.height).toBe(360);
      expect(host.width).toBe(640);
      expect(host.height).toBe(360);
    });
  });

  describe('videoWidth / videoHeight', () => {
    it('returns 0 when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.videoWidth).toBe(0);
      expect(host.videoHeight).toBe(0);
    });

    it('reads through the target', () => {
      const { host, video } = createHost();
      expect(host.videoWidth).toBe(video.videoWidth);
      expect(host.videoHeight).toBe(video.videoHeight);
    });
  });

  describe('disablePictureInPicture', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.disablePictureInPicture).toBe(false);
    });

    it('reads and writes through the target', () => {
      const { host, video } = createHost();

      host.disablePictureInPicture = true;
      expect(video.disablePictureInPicture).toBe(true);
      expect(host.disablePictureInPicture).toBe(true);
    });
  });
});
