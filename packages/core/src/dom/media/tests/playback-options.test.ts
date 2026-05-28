import { describe, expect, it } from 'vitest';
import { HTMLVideoElementHost } from '../html-video-element-host';

function createHost() {
  const host = new HTMLVideoElementHost();
  const video = document.createElement('video');
  host.target = video;
  return { host, video };
}

describe('HTMLMediaElementLayer playback options', () => {
  describe('autoplay', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.autoplay).toBe(false);
    });

    it('reads and writes through the chain', () => {
      const { host, video } = createHost();

      host.autoplay = true;
      expect(video.autoplay).toBe(true);
      expect(host.autoplay).toBe(true);

      host.autoplay = false;
      expect(video.autoplay).toBe(false);
    });
  });

  describe('defaultMuted', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.defaultMuted).toBe(false);
    });

    it('reads and writes through the chain', () => {
      const { host, video } = createHost();

      host.defaultMuted = true;
      expect(video.defaultMuted).toBe(true);
      expect(host.defaultMuted).toBe(true);
    });
  });

  describe('controls', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.controls).toBe(false);
    });

    it('reads and writes through the chain', () => {
      const { host, video } = createHost();

      host.controls = true;
      expect(video.controls).toBe(true);
      expect(host.controls).toBe(true);
    });
  });
});

describe('HTMLVideoElementHost playsInline', () => {
  it('returns false when no target is attached', () => {
    const host = new HTMLVideoElementHost();
    expect(host.playsInline).toBe(false);
  });

  it('reads and writes the target', () => {
    const { host, video } = createHost();

    host.playsInline = true;
    expect(video.playsInline).toBe(true);
    expect(host.playsInline).toBe(true);
  });
});
