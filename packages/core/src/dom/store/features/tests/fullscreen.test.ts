import { createStore } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import type { WebKitVideoElement } from '../../../presentation/types';
import { createMockVideoHost } from '../../../tests/test-helpers';
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
      const { host } = createMockVideoHost();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      expect(store.state.fullscreen).toBe(false);
    });

    it('detects fullscreen availability when supported', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { host } = createMockVideoHost();
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container: null });

      expect(store.state.fullscreenAvailability).toBe('available');
    });

    it('detects fullscreen unavailable when not supported', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { host } = createMockVideoHost();
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container: null });

      expect(store.state.fullscreenAvailability).toBe('unsupported');
    });

    it('detects fullscreen availability via webkitEnterFullscreen (iOS Safari)', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      // Simulate iOS Safari: webkitEnterFullscreen on video prototype
      const proto = HTMLVideoElement.prototype as WebKitVideoElement;
      const original = proto.webkitEnterFullscreen;
      proto.webkitEnterFullscreen = () => {};

      const { host } = createMockVideoHost();
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container: null });

      expect(store.state.fullscreenAvailability).toBe('available');

      if (original) {
        proto.webkitEnterFullscreen = original;
      } else {
        delete proto.webkitEnterFullscreen;
      }
    });

    it('syncs fullscreen on webkitpresentationmodechanged event (iOS Safari)', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { host, video } = createMockVideoHost();
      const wkVideo = video as HTMLVideoElement & WebKitVideoElement;
      wkVideo.webkitPresentationMode = 'inline';
      wkVideo.webkitDisplayingFullscreen = false;

      const container = document.createElement('div');
      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      expect(store.state.fullscreen).toBe(false);

      // Simulate entering fullscreen via WebKit presentation mode
      wkVideo.webkitPresentationMode = 'fullscreen';
      wkVideo.webkitDisplayingFullscreen = true;
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.fullscreen).toBe(true);

      // Simulate exiting
      wkVideo.webkitPresentationMode = 'inline';
      wkVideo.webkitDisplayingFullscreen = false;
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));

      expect(store.state.fullscreen).toBe(false);
    });

    it('updates fullscreen on fullscreenchange event', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { host } = createMockVideoHost();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

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

      const { host } = createMockVideoHost();
      const container = document.createElement('div');

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

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

      const { host } = createMockVideoHost();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      await store.requestFullscreen();

      expect(container.requestFullscreen).toHaveBeenCalled();
    });

    it('requestFullscreen() falls back to media when no container', async () => {
      const { host, video } = createMockVideoHost();
      video.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container: null });

      await store.requestFullscreen();

      expect(video.requestFullscreen).toHaveBeenCalled();
    });

    it('exitFullscreen() calls document.exitFullscreen', async () => {
      const originalExit = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      const { host } = createMockVideoHost();

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

      const { host, video } = createMockVideoHost();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      // Set PiP as active
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
    });

    it('requestFullscreen() does not exit PiP if not active', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });

      const originalExit = document.exitPictureInPicture;
      document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

      const { host } = createMockVideoHost();
      const container = document.createElement('div');
      container.requestFullscreen = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(fullscreenFeature);
      store.attach({ media: host, container });

      await store.requestFullscreen();

      expect(document.exitPictureInPicture).not.toHaveBeenCalled();
      expect(container.requestFullscreen).toHaveBeenCalled();

      document.exitPictureInPicture = originalExit;
    });
  });
});
