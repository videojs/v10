import { createStore } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayerTarget } from '../../../media/types';
import { presentationFeature } from '../presentation';

describe('presentationFeature', () => {
  let originalFullscreenEnabled: boolean | undefined;
  let originalPictureInPictureEnabled: boolean | undefined;

  beforeEach(() => {
    // Save original values
    originalFullscreenEnabled = document.fullscreenEnabled;
    originalPictureInPictureEnabled = document.pictureInPictureEnabled;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: originalFullscreenEnabled,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: originalPictureInPictureEnabled,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
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
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container });

      expect(store.state.fullscreenActive).toBe(false);
      expect(store.state.pipActive).toBe(false);
    });

    it('detects fullscreen availability when supported', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const store = createStore<PlayerTarget>()(presentationFeature);
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
      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container: null });

      expect(store.state.fullscreenAvailability).toBe('unsupported');
    });

    it('detects PiP availability when supported', () => {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container: null });

      expect(store.state.pipAvailability).toBe('available');
    });

    it('updates fullscreenActive on fullscreenchange event', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container });

      expect(store.state.fullscreenActive).toBe(false);

      // Simulate entering fullscreen
      Object.defineProperty(document, 'fullscreenElement', {
        value: container,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreenActive).toBe(true);

      // Simulate exiting fullscreen
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(store.state.fullscreenActive).toBe(false);
    });

    it('updates pipActive on PiP events', () => {
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container: null });

      expect(store.state.pipActive).toBe(false);

      // Simulate entering PiP
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });
      video.dispatchEvent(new Event('enterpictureinpicture'));

      expect(store.state.pipActive).toBe(true);

      // Simulate exiting PiP
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: null,
        writable: true,
        configurable: true,
      });
      video.dispatchEvent(new Event('leavepictureinpicture'));

      expect(store.state.pipActive).toBe(false);
    });

    it('stops listening when store is destroyed', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(presentationFeature);
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
      expect(store.state.fullscreenActive).toBe(false);
    });
  });

  describe('actions', () => {
    it('requestFullscreen() calls requestFullscreen on container', async () => {
      const video = createMockVideo();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(container.requestFullscreen).toHaveBeenCalled();
    });

    it('requestFullscreen() falls back to media when no container', async () => {
      const video = createMockVideo();
      video.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container: null });

      await store.requestFullscreen();

      expect(video.requestFullscreen).toHaveBeenCalled();
    });

    it('exitFullscreen() calls document.exitFullscreen', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container: null });

      await store.exitFullscreen();

      expect(document.exitFullscreen).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });

    it('requestPiP() calls requestPictureInPicture on video', async () => {
      const video = createMockVideo();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container: null });

      await store.requestPiP();

      expect(video.requestPictureInPicture).toHaveBeenCalled();
    });

    it('exitPiP() calls document.exitPictureInPicture', async () => {
      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();

      // Set the video as the current PiP element
      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container: null });

      await store.exitPiP();

      expect(document.exitPictureInPicture).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });
  });

  describe('transitions', () => {
    it('requestFullscreen() exits PiP first if active', async () => {
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

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(document.exitPictureInPicture).toHaveBeenCalled();
      expect(container.requestFullscreen).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });

    it('requestPiP() exits fullscreen first if active', async () => {
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

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container });

      await store.requestPiP();

      expect(document.exitFullscreen).toHaveBeenCalled();
      expect(video.requestPictureInPicture).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });

    it('requestFullscreen() does not exit PiP if not active', async () => {
      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(document.exitPictureInPicture).not.toHaveBeenCalled();
      expect(container.requestFullscreen).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });

    it('requestPiP() does not exit fullscreen if not active', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});

      const store = createStore<PlayerTarget>()(presentationFeature);
      store.attach({ media: video, container: null });

      await store.requestPiP();

      expect(document.exitFullscreen).not.toHaveBeenCalled();
      expect(video.requestPictureInPicture).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });
  });
});

function createMockVideo(): HTMLVideoElement {
  return document.createElement('video');
}
