import { createStore } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { HTMLVideoElementHost } from '../../../media/video-host';
import type { WebKitVideoElement } from '../../../presentation/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { fullscreenFeature } from '../fullscreen';

describe('fullscreenFeature', () => {
  let originalFullscreenEnabled: boolean | undefined;

  beforeEach(() => {
    originalFullscreenEnabled = document.fullscreenEnabled;
  });

  afterEach(() => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: originalFullscreenEnabled,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  describe('attach', () => {
    it('syncs initial state on attach', () => {
      const video = createMockVideo();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      expect(store.state.fullscreen).toBe(false);
    });

    it('detects fullscreen availability when supported', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      expect(store.state.fullscreenAvailability).toBe('available');
    });

    it('detects fullscreen unavailable when not supported', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      expect(store.state.fullscreenAvailability).toBe('unsupported');
    });

    it('detects fullscreen availability via webkitSetPresentationMode (iOS Safari)', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      // Simulate iOS Safari: webkitSetPresentationMode on video prototype
      const proto = HTMLVideoElement.prototype as WebKitVideoElement;
      const original = proto.webkitSetPresentationMode;
      proto.webkitSetPresentationMode = () => {};

      const video = createMockVideo();
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      expect(store.state.fullscreenAvailability).toBe('available');

      if (original) {
        proto.webkitSetPresentationMode = original;
      } else {
        delete proto.webkitSetPresentationMode;
      }
    });

    it('syncs fullscreen on webkitpresentationmodechanged event (iOS Safari)', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';

      const container = document.createElement('div');
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      expect(store.state.fullscreen).toBe(false);

      // Simulate entering fullscreen via WebKit presentation mode
      video.webkitPresentationMode = 'fullscreen';
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.fullscreen).toBe(true);

      // Simulate exiting
      video.webkitPresentationMode = 'inline';
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.fullscreen).toBe(false);
    });

    it('updates fullscreen on fullscreenchange event', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      expect(store.state.fullscreen).toBe(false);

      // Simulate entering fullscreen
      Object.defineProperty(document, 'fullscreenElement', {
        value: container,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreen).toBe(true);

      // Simulate exiting fullscreen
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreen).toBe(false);
    });

    it('detects fullscreen via :fullscreen pseudo-class when container is in a shadow tree', () => {
      // When `requestFullscreen()` is called on an element inside a shadow
      // tree, `document.fullscreenElement` returns the shadow host — not the
      // actual fullscreen element. The `:fullscreen` pseudo-class matches the
      // real fullscreen element across shadow boundaries.
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const shadowHost = document.createElement('div');
      const container = document.createElement('div');
      const matchesSpy = vi.spyOn(container, 'matches').mockImplementation((selector) => selector === ':fullscreen');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      Object.defineProperty(document, 'fullscreenElement', {
        value: shadowHost,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreen).toBe(true);

      matchesSpy.mockReturnValue(false);
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreen).toBe(false);
      matchesSpy.mockRestore();
    });

    it('detects fullscreen via :fullscreen pseudo-class on the media element', () => {
      // When the inner `<video>` of a custom media element is fullscreened
      // directly (e.g. via native controls), `document.fullscreenElement`
      // points to a different element, but `:fullscreen` matches the media
      // element because the fullscreen flag propagates to ancestors across
      // shadow boundaries.
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const container = document.createElement('div');
      const unrelated = document.createElement('div');
      const matchesSpy = vi.spyOn(video, 'matches').mockImplementation((selector) => selector === ':fullscreen');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      Object.defineProperty(document, 'fullscreenElement', {
        value: unrelated,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreen).toBe(true);
      matchesSpy.mockRestore();
    });

    it('stops listening when store is destroyed', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      store.destroy();

      // Simulate entering fullscreen after destroy
      Object.defineProperty(document, 'fullscreenElement', {
        value: container,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      // State should not update after destroy
      expect(store.state.fullscreen).toBe(false);
    });
  });

  describe('actions', () => {
    it('requestFullscreen() calls requestFullscreen on container', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(container.requestFullscreen).toHaveBeenCalled();
    });

    it('requestFullscreen() falls back to media when no container', async () => {
      const video = createMockVideo();
      video.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      await store.requestFullscreen();

      expect(video.requestFullscreen).toHaveBeenCalled();
    });

    it('exitFullscreen() calls document.exitFullscreen', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      await store.exitFullscreen();

      expect(document.exitFullscreen).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });

    it('requestFullscreen() uses webkitSetPresentationMode when element fullscreen is unsupported (iOS Safari)', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
      video.webkitSetPresentationMode = vi.fn();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(video.webkitSetPresentationMode).toHaveBeenCalledWith('fullscreen');
    });

    it('exitFullscreen() uses webkitSetPresentationMode first when available (iOS Safari)', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn();

      const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
      video.webkitSetPresentationMode = vi.fn();

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      await store.exitFullscreen();

      expect(video.webkitSetPresentationMode).toHaveBeenCalledWith('inline');
      expect(document.exitFullscreen).not.toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });
  });

  describe('transitions', () => {
    it('requestFullscreen() exits PiP first if active', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      // Set PiP as active
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(document.exitPictureInPicture).toHaveBeenCalled();
      expect(container.requestFullscreen).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });

    it('requestFullscreen() does not exit PiP if not active', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(document.exitPictureInPicture).not.toHaveBeenCalled();
      expect(container.requestFullscreen).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });
  });
});

describe('fullscreenFeature with HTMLVideoElementHost', () => {
  let originalFullscreenEnabled: boolean | undefined;

  beforeEach(() => {
    originalFullscreenEnabled = document.fullscreenEnabled;
  });

  afterEach(() => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: originalFullscreenEnabled,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  describe('attach', () => {
    it('syncs initial state on attach', () => {
      const video = createMockVideo();
      const container = document.createElement('div');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      expect(store.state.fullscreen).toBe(false);
    });

    it('reflects host.isFullscreen when document.fullscreenElement is the underlying video', () => {
      const video = createMockVideo();
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document, 'fullscreenElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container: null });

      expect(store.state.fullscreen).toBe(true);
    });

    it('updates fullscreen on fullscreenchange when container matches', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const container = document.createElement('div');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      expect(store.state.fullscreen).toBe(false);

      Object.defineProperty(document, 'fullscreenElement', {
        value: container,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreen).toBe(true);

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreen).toBe(false);
    });

    it('syncs fullscreen on webkitpresentationmodechanged forwarded from target (iOS Safari)', () => {
      const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';
      const container = document.createElement('div');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      expect(store.state.fullscreen).toBe(false);

      video.webkitPresentationMode = 'fullscreen';
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.fullscreen).toBe(true);

      video.webkitPresentationMode = 'inline';
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.fullscreen).toBe(false);
    });
  });

  describe('actions', () => {
    it('requestFullscreen() calls requestFullscreen on container', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      const host = new HTMLVideoElementHost();
      host.attach(video);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      await store.requestFullscreen();

      expect(container.requestFullscreen).toHaveBeenCalled();
    });

    it('requestFullscreen() falls back to host.requestFullscreen when no container', async () => {
      const video = createMockVideo();
      video.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      const host = new HTMLVideoElementHost();
      host.attach(video);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container: null });

      await store.requestFullscreen();

      expect(video.requestFullscreen).toHaveBeenCalled();
    });

    it('requestFullscreen() prefers webkitSetPresentationMode on the underlying video (iOS Safari)', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
      video.webkitSetPresentationMode = vi.fn();
      const container = document.createElement('div');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      await store.requestFullscreen();

      expect(video.webkitSetPresentationMode).toHaveBeenCalledWith('fullscreen');
    });

    it('exitFullscreen() calls document.exitFullscreen', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      const host = new HTMLVideoElementHost();
      host.attach(video);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container: null });

      await store.exitFullscreen();

      expect(document.exitFullscreen).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });
  });

  describe('transitions', () => {
    it('requestFullscreen() exits PiP first if active', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      await store.requestFullscreen();

      expect(document.exitPictureInPicture).toHaveBeenCalled();
      expect(container.requestFullscreen).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: null,
        writable: true,
        configurable: true,
      });
    });
  });
});
