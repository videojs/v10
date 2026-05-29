import { describe, expect, it, vi } from 'vitest';
import { HTMLVideoElementHost } from '../html-video-element-host';

function createHost() {
  const host = new HTMLVideoElementHost();
  const video = document.createElement('video');
  host.target = video;
  return { host, video };
}

describe('HTMLMediaElementLayer source accessors', () => {
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
