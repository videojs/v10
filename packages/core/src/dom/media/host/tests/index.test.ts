import { describe, expect, it } from 'vitest';

import { HTMLAudioElementHost, HTMLVideoElementHost, toMediaHost } from '..';

describe('toMediaHost', () => {
  it('wraps a raw HTMLVideoElement in an HTMLVideoElementHost attached to it', () => {
    const video = document.createElement('video');

    const result = toMediaHost(video);

    expect(result.media).toBeInstanceOf(HTMLVideoElementHost);
    expect((result.media as HTMLVideoElementHost).target).toBe(video);
  });

  it('wraps a raw HTMLAudioElement in an HTMLAudioElementHost attached to it', () => {
    const audio = document.createElement('audio');

    const result = toMediaHost(audio);

    expect(result.media).toBeInstanceOf(HTMLAudioElementHost);
    expect((result.media as HTMLAudioElementHost).target).toBe(audio);
  });

  it('exposes the wrapped host API on the result media (e.g. requestFullscreen)', () => {
    const video = document.createElement('video');

    const { media } = toMediaHost(video);

    expect(typeof media.isFullscreen).toBe('boolean');
    expect(typeof media.requestFullscreen).toBe('function');
    expect(typeof media.exitFullscreen).toBe('function');
    expect(typeof media.isPictureInPicture).toBe('boolean');
    expect(typeof media.requestPictureInPicture).toBe('function');
    expect(typeof media.exitPictureInPicture).toBe('function');
  });

  it('release() detaches the auto-created host from the underlying element', () => {
    const video = document.createElement('video');
    const result = toMediaHost(video);

    expect((result.media as HTMLVideoElementHost).target).toBe(video);

    result.release();

    expect((result.media as HTMLVideoElementHost).target).toBeNull();
  });

  it('returns existing hosts unchanged with a no-op release', () => {
    const video = document.createElement('video');
    const host = new HTMLVideoElementHost();
    host.attach(video);

    const result = toMediaHost(host);

    expect(result.media).toBe(host);
    result.release();
    // Host stays attached — release is a no-op for inputs we did not create.
    expect(host.target).toBe(video);
  });

  it('returns non-element values unchanged with a no-op release', () => {
    const fake = { play: () => Promise.resolve() } as unknown as HTMLVideoElement;

    const result = toMediaHost(fake);

    expect(result.media).toBe(fake);
    expect(() => result.release()).not.toThrow();
  });
});
