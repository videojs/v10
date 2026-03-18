import { createStore } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import type { WebKitVideoElement } from '../../../presentation/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { pipFeature } from '../pip';

describe('pipFeature', () => {
  let originalPictureInPictureEnabled: boolean | undefined;

  beforeEach(() => {
    originalPictureInPictureEnabled = document.pictureInPictureEnabled;
  });

  afterEach(() => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: originalPictureInPictureEnabled,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'pictureInPictureElement', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  describe('attach', () => {
    it('syncs initial state on attach', () => {
      const video = createMockVideo();

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      expect(store.state.pip).toBe(false);
    });

    it('detects PiP availability when supported', () => {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      expect(store.state.pipAvailability).toBe('available');
    });

    it('updates pip on PiP events', () => {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      expect(store.state.pip).toBe(false);

      // Simulate entering PiP
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });
      video.dispatchEvent(new Event('enterpictureinpicture'));

      expect(store.state.pip).toBe(true);

      // Simulate exiting PiP
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: null,
        writable: true,
        configurable: true,
      });
      video.dispatchEvent(new Event('leavepictureinpicture'));

      expect(store.state.pip).toBe(false);
    });

    it('syncs pip on webkitpresentationmodechanged event (iOS Safari)', () => {
      const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      expect(store.state.pip).toBe(false);

      // Simulate entering PiP via WebKit presentation mode
      video.webkitPresentationMode = 'picture-in-picture';
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.pip).toBe(true);

      // Simulate exiting
      video.webkitPresentationMode = 'inline';
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.pip).toBe(false);
    });

    it('syncs pip when media element proxies to an internal target video', () => {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const targetVideo = createMockVideo();
      const mediaHost = document.createElement('div') as unknown as HTMLVideoElement & {
        target: HTMLVideoElement;
      };

      Object.defineProperty(mediaHost, 'target', {
        value: targetVideo,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: mediaHost, container: null });

      expect(store.state.pip).toBe(false);

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: targetVideo,
        writable: true,
        configurable: true,
      });
      mediaHost.dispatchEvent(new Event('enterpictureinpicture'));

      expect(store.state.pip).toBe(true);
    });
  });

  describe('actions', () => {
    it('requestPictureInPicture() calls requestPictureInPicture on video', async () => {
      const video = createMockVideo();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      await store.requestPictureInPicture();

      expect(video.requestPictureInPicture).toHaveBeenCalled();
    });

    it('requestPictureInPicture() falls back to webkitSetPresentationMode when standard API throws (iOS Safari)', async () => {
      const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
      video.requestPictureInPicture = vi.fn().mockRejectedValue(new Error('not supported'));
      video.webkitSetPresentationMode = vi.fn();

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      await store.requestPictureInPicture();

      expect(video.webkitSetPresentationMode).toHaveBeenCalledWith('picture-in-picture');
    });

    it('exitPictureInPicture() calls document.exitPictureInPicture', async () => {
      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();

      // Set the video as the current PiP element
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      await store.exitPictureInPicture();

      expect(document.exitPictureInPicture).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });

    it('exitPictureInPicture() calls document.exitPictureInPicture even without pictureInPictureElement', async () => {
      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      await store.exitPictureInPicture();

      expect(document.exitPictureInPicture).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });
  });

  describe('transitions', () => {
    it('requestPictureInPicture() exits fullscreen first if active', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});
      const container = document.createElement('div');

      // Set fullscreen as active
      Object.defineProperty(document, 'fullscreenElement', {
        value: container,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container });

      await store.requestPictureInPicture();

      expect(document.exitFullscreen).toHaveBeenCalled();
      expect(video.requestPictureInPicture).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });

    it('requestPictureInPicture() does not exit fullscreen if not active', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      await store.requestPictureInPicture();

      expect(document.exitFullscreen).not.toHaveBeenCalled();
      expect(video.requestPictureInPicture).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });
  });
});
