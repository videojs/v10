import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  Media,
  MediaPauseCapability,
  MediaPlaybackRateCapability,
  MediaRemotePlaybackCapability,
  MediaRemotePlaybackTarget,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaVolumeCapability,
  RemotePlaybackLike,
  RemotePlaybackState,
} from '../../../core/media/types';
import type { WebKitDocument, WebKitVideoElement } from '../../presentation/types';
import { HTMLAudioElementHost } from '../audio-host';
import { HTMLVideoElementHost } from '../video-host';

afterEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(document, 'pictureInPictureElement', {
    value: null,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document, 'fullscreenElement', {
    value: null,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document, 'webkitFullscreenElement', {
    value: null,
    writable: true,
    configurable: true,
  });
});

describe('HTMLVideoElementHost', () => {
  describe('remote playback', () => {
    it('returns null when no native or remote target remote is available', () => {
      const host = new HTMLVideoElementHost();

      expect(host.remote).toBeNull();
    });

    it('returns remote target remote while set and native remote after clearing', () => {
      const host = new HTMLVideoElementHost();
      const video = document.createElement('video');
      const nativeRemote = new TestRemotePlayback();
      const remote = createRemoteMedia({ remote: new TestRemotePlayback() });

      Object.defineProperty(video, 'remote', {
        value: nativeRemote,
        configurable: true,
      });

      host.attach(video);
      host.setRemoteMedia(remote);
      expect(host.remote).toBe(remote.remote);

      host.setRemoteMedia(null);
      expect(host.remote).toBe(nativeRemote);
    });

    it('falls back to native playback when the remote target is unsupported', async () => {
      const host = new HTMLVideoElementHost();
      const video = document.createElement('video');
      const nativeRemote = new TestRemotePlayback();
      const remote = createRemoteMedia({ active: true, supported: false });

      Object.defineProperty(video, 'remote', {
        value: nativeRemote,
        configurable: true,
      });
      video.play = vi.fn(async () => {});

      host.attach(video);
      host.setRemoteMedia(remote);
      await host.play();

      expect(host.remote).toBe(nativeRemote);
      expect(remote.play).not.toHaveBeenCalled();
      expect(video.play).toHaveBeenCalled();
    });

    it('notifies remote targets when local media attaches and detaches', () => {
      const host = new HTMLVideoElementHost();
      const setLocalMedia = vi.fn();
      const remote = createRemoteMedia({ setLocalMedia });

      host.setRemoteMedia(remote);
      expect(setLocalMedia).toHaveBeenCalledWith(host);

      host.setRemoteMedia(null);
      expect(setLocalMedia).toHaveBeenCalledWith(null);
    });

    it('clears the previous remote target when replacing it', () => {
      const host = new HTMLVideoElementHost();
      const firstSetLocalMedia = vi.fn();
      const secondSetLocalMedia = vi.fn();
      const first = createRemoteMedia({ setLocalMedia: firstSetLocalMedia });
      const second = createRemoteMedia({ setLocalMedia: secondSetLocalMedia });

      host.setRemoteMedia(first);
      host.setRemoteMedia(second);

      expect(firstSetLocalMedia).toHaveBeenCalledWith(null);
      expect(secondSetLocalMedia).toHaveBeenCalledWith(host);
    });

    it('dispatches remotetargetchange when setting and clearing remote media', () => {
      const host = new HTMLVideoElementHost();
      const remote = createRemoteMedia({ remote: new TestRemotePlayback() });
      const events: CustomEvent[] = [];

      host.addEventListener('remotetargetchange', (event) => {
        events.push(event as CustomEvent);
      });

      host.setRemoteMedia(remote);
      host.setRemoteMedia(null);

      expect(events).toHaveLength(2);
      expect(events[0]!.detail).toEqual({
        remoteTarget: remote,
        remote: remote.remote,
      });
      expect(events[1]!.detail).toEqual({
        remoteTarget: null,
        remote: null,
      });
    });

    it('delegates playback to active remote media', async () => {
      const host = new HTMLVideoElementHost();
      const remote = createRemoteMedia({ active: true });

      host.setRemoteMedia(remote);
      await host.play();
      host.pause();

      expect(remote.play).toHaveBeenCalled();
      expect(remote.pause).toHaveBeenCalled();
    });

    it('uses local playback while remote media is inactive', async () => {
      const host = new HTMLVideoElementHost();
      const video = document.createElement('video');
      const remote = createRemoteMedia({ active: false });

      video.play = vi.fn(async () => {});
      video.pause = vi.fn();

      host.attach(video);
      host.setRemoteMedia(remote);
      await host.play();
      host.pause();

      expect(remote.play).not.toHaveBeenCalled();
      expect(remote.pause).not.toHaveBeenCalled();
      expect(video.play).toHaveBeenCalled();
      expect(video.pause).toHaveBeenCalled();
    });

    it('keeps audio hosts remote playback capable', () => {
      const host = new HTMLAudioElementHost();
      const remote = createRemoteMedia({ active: true, currentTime: 10, muted: false, volume: 0.5 });

      host.setRemoteMedia(remote);
      host.currentTime = 20;
      host.muted = true;
      host.volume = 0.25;

      expect(remote.currentTime).toBe(20);
      expect(remote.muted).toBe(true);
      expect(remote.volume).toBe(0.25);
      expect(host.remote).toBeDefined();
    });
  });

  describe('isPictureInPicture', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.isPictureInPicture).toBe(false);
    });

    it('returns true when target is the PiP element', () => {
      const video = document.createElement('video');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      expect(host.isPictureInPicture).toBe(true);
    });

    it('reflects target swaps', () => {
      const a = document.createElement('video');
      const b = document.createElement('video');
      const host = new HTMLVideoElementHost();

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: b,
        writable: true,
        configurable: true,
      });

      host.attach(a);
      expect(host.isPictureInPicture).toBe(false);

      host.detach();
      host.attach(b);
      expect(host.isPictureInPicture).toBe(true);
    });

    it('detects WebKit picture-in-picture presentation mode', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'picture-in-picture';

      const host = new HTMLVideoElementHost();
      host.attach(video);

      expect(host.isPictureInPicture).toBe(true);
    });

    it('returns false when WebKit presentation mode is inline', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';

      const host = new HTMLVideoElementHost();
      host.attach(video);

      expect(host.isPictureInPicture).toBe(false);
    });
  });

  describe('isFullscreen', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.isFullscreen).toBe(false);
    });

    it('returns true when document.fullscreenElement matches the target', () => {
      const video = document.createElement('video');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document, 'fullscreenElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      expect(host.isFullscreen).toBe(true);
    });

    it('returns true when webkitFullscreenElement matches the target', () => {
      const video = document.createElement('video');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document as WebKitDocument, 'webkitFullscreenElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      expect(host.isFullscreen).toBe(true);
    });

    it('returns false when fullscreen element is something else', () => {
      const video = document.createElement('video');
      const other = document.createElement('div');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document, 'fullscreenElement', {
        value: other,
        writable: true,
        configurable: true,
      });

      expect(host.isFullscreen).toBe(false);
    });

    it('detects WebKit fullscreen presentation mode', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'fullscreen';

      const host = new HTMLVideoElementHost();
      host.attach(video);

      expect(host.isFullscreen).toBe(true);
    });

    it('returns false when WebKit presentation mode is inline', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';

      const host = new HTMLVideoElementHost();
      host.attach(video);

      expect(host.isFullscreen).toBe(false);
    });
  });
});

type TestRemoteMedia = EventTarget &
  Media &
  MediaRemotePlaybackCapability &
  MediaRemotePlaybackTarget &
  MediaPauseCapability &
  MediaSeekCapability &
  MediaSourceCapability &
  MediaVolumeCapability &
  MediaPlaybackRateCapability;

class TestRemotePlayback extends EventTarget implements RemotePlaybackLike {
  state: RemotePlaybackState = 'disconnected';
  prompt = vi.fn(async () => {});
  watchAvailability = vi.fn(async () => 1);
  cancelWatchAvailability = vi.fn(async () => {});
}

function createRemoteMedia(overrides: Partial<TestRemoteMedia> = {}): TestRemoteMedia {
  return Object.assign(new EventTarget(), {
    remote: new TestRemotePlayback(),
    supported: true,
    active: false,
    src: '',
    currentSrc: '',
    paused: false,
    ended: false,
    seeking: false,
    readyState: 3,
    muted: false,
    volume: 1,
    playbackRate: 1,
    duration: 100,
    currentTime: 0,
    load: vi.fn(),
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    ...overrides,
  });
}
