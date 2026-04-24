import { createStore } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import type { WebKitVideoElement } from '../../../presentation/types';
import { createMockVideoHost } from '../../../tests/test-helpers';
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
      const { host } = createMockVideoHost();

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container: null });

      expect(store.state.pip).toBe(false);
    });

    it('detects PiP availability when supported', () => {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { host } = createMockVideoHost();
      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container: null });

      expect(store.state.pipAvailability).toBe('available');
    });

    it('updates pip on PiP events', () => {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { host, video } = createMockVideoHost();

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container: null });

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
      const { host, video } = createMockVideoHost();
      const wkVideo = video as HTMLVideoElement & WebKitVideoElement;
      wkVideo.webkitPresentationMode = 'inline';

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container: null });

      expect(store.state.pip).toBe(false);

      // Simulate entering PiP via WebKit presentation mode
      wkVideo.webkitPresentationMode = 'picture-in-picture';
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.pip).toBe(true);

      // Simulate exiting
      wkVideo.webkitPresentationMode = 'inline';
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.pip).toBe(false);
    });
  });

  describe('actions', () => {
    it('requestPictureInPicture() calls requestPictureInPicture on video', async () => {
      const { host, video } = createMockVideoHost();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container: null });

      await store.requestPictureInPicture();

      expect(video.requestPictureInPicture).toHaveBeenCalled();
    });

    it('exitPictureInPicture() calls document.exitPictureInPicture', async () => {
      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const { host, video } = createMockVideoHost();

      // Set the video as the current PiP element
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container: null });

      await store.exitPictureInPicture();

      expect(document.exitPictureInPicture).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });

    it('exitPictureInPicture() is a no-op when not in picture-in-picture', async () => {
      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const { host } = createMockVideoHost();

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container: null });

      await store.exitPictureInPicture();

      expect(document.exitPictureInPicture).not.toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });
  });

  describe('transitions', () => {
    it('requestPictureInPicture() exits fullscreen first if active', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const { host, video } = createMockVideoHost();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});
      const container = document.createElement('div');

      // Set fullscreen as active
      Object.defineProperty(document, 'fullscreenElement', {
        value: container,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container });

      await store.requestPictureInPicture();

      expect(document.exitFullscreen).toHaveBeenCalled();
      expect(video.requestPictureInPicture).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });

    it('requestPictureInPicture() does not exit fullscreen if not active', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const { host, video } = createMockVideoHost();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: host, container: null });

      await store.requestPictureInPicture();

      expect(document.exitFullscreen).not.toHaveBeenCalled();
      expect(video.requestPictureInPicture).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });
  });
});
