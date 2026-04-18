import { createStore } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import type { WebKitVideoElement } from '../../../presentation/webkit';
import { createMockVideo } from '../../../tests/test-helpers';
import { fullscreenFeature } from '../fullscreen';

function createWebKitVideo() {
  const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
  video.webkitSetPresentationMode = vi.fn();
  video.webkitSupportsPresentationMode = vi.fn().mockReturnValue(true);
  Object.defineProperty(video, 'webkitPresentationMode', {
    value: 'inline',
    writable: true,
    configurable: true,
  });
  return video;
}

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

      const video = createWebKitVideo();
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      expect(store.state.fullscreenAvailability).toBe('available');
    });

    it('syncs fullscreen on webkitpresentationmodechanged event (iOS Safari)', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const video = createWebKitVideo();
      const container = document.createElement('div');
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      expect(store.state.fullscreen).toBe(false);

      // Simulate entering fullscreen via WebKit presentation mode
      Object.defineProperty(video, 'webkitPresentationMode', {
        value: 'fullscreen',
        writable: true,
        configurable: true,
      });
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.fullscreen).toBe(true);

      // Simulate exiting
      Object.defineProperty(video, 'webkitPresentationMode', { value: 'inline', writable: true, configurable: true });
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

      const video = createWebKitVideo();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(video.webkitSetPresentationMode).toHaveBeenCalledWith('fullscreen');
    });

    it('requestFullscreen() falls back to media.requestFullscreen when webkitSetPresentationMode is unavailable', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();
      video.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container });

      await store.requestFullscreen();

      expect(video.requestFullscreen).toHaveBeenCalled();
    });

    it('exitFullscreen() uses webkitSetPresentationMode when video is in WebKit fullscreen (iOS Safari)', async () => {
      const originalExit = document.exitFullscreen;
      // Remove document.exitFullscreen so the webkit path is reached
      Object.defineProperty(document, 'exitFullscreen', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const video = createWebKitVideo();
      Object.defineProperty(video, 'webkitPresentationMode', {
        value: 'fullscreen',
        writable: true,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      await store.exitFullscreen();

      expect(video.webkitSetPresentationMode).toHaveBeenCalledWith('inline');

      Object.defineProperty(document, 'exitFullscreen', {
        value: originalExit,
        writable: true,
        configurable: true,
      });
    });

    it('exitFullscreen() falls back to webkitExitFullscreen when document.exitFullscreen is unavailable', async () => {
      const originalExit = document.exitFullscreen;
      Object.defineProperty(document, 'exitFullscreen', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock webkitExitFullscreen on document
      Object.defineProperty(document, 'webkitFullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });
      const webkitExit = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, 'webkitExitFullscreen', {
        value: webkitExit,
        writable: true,
        configurable: true,
      });

      const video = createMockVideo();

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: video, container: null });

      await store.exitFullscreen();

      expect(webkitExit).toHaveBeenCalled();

      Object.defineProperty(document, 'exitFullscreen', {
        value: originalExit,
        writable: true,
        configurable: true,
      });
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
