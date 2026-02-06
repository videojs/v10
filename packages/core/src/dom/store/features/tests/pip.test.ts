import { createStore } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayerTarget } from '../../../media/types';
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
  });

  describe('actions', () => {
    it('requestPiP() calls requestPictureInPicture on video', async () => {
      const video = createMockVideo();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});

      const store = createStore<PlayerTarget>()(pipFeature);
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

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container: null });

      await store.exitPiP();

      expect(document.exitPictureInPicture).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });
  });

  describe('transitions', () => {
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

      const store = createStore<PlayerTarget>()(pipFeature);
      store.attach({ media: video, container });

      await store.requestPiP();

      expect(document.exitFullscreen).toHaveBeenCalled();
      expect(video.requestPictureInPicture).toHaveBeenCalled();

      document.exitFullscreen = originalExit;
    });

    it('requestPiP() does not exit fullscreen if not active', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const video = createMockVideo();
      video.requestPictureInPicture = vi.fn().mockResolvedValue({});

      const store = createStore<PlayerTarget>()(pipFeature);
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
