import { createStore } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideoHost } from '../../../tests/test-helpers';
import { playbackFeature } from '../playback';

describe('playbackFeature', () => {
  describe('attach', () => {
    it('syncs playback state on attach', () => {
      const { host } = createMockVideoHost({
        paused: false,
        ended: false,
        currentTime: 30,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.paused).toBe(false);
      expect(store.state.ended).toBe(false);
      expect(store.state.started).toBe(true);
      expect(store.state.waiting).toBe(false);
    });

    it('detects waiting state when buffering', () => {
      const { host } = createMockVideoHost({
        paused: false,
        readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.waiting).toBe(true);
    });

    it('detects started from currentTime', () => {
      const { host } = createMockVideoHost({
        paused: true,
        currentTime: 5,
      });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.started).toBe(true);
    });

    it('detects started from playing state', () => {
      const { host } = createMockVideoHost({
        paused: false,
        currentTime: 0,
      });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.started).toBe(true);
    });

    it('updates on play event', () => {
      const { host, video } = createMockVideoHost({ paused: true });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.paused).toBe(true);

      // Update mock to playing state
      Object.defineProperty(video, 'paused', { value: false, writable: false, configurable: true });
      video.dispatchEvent(new Event('play'));

      expect(store.state.paused).toBe(false);
    });

    it('updates on pause event', () => {
      const { host, video } = createMockVideoHost({ paused: false });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.paused).toBe(false);

      // Update mock to paused state
      Object.defineProperty(video, 'paused', { value: true, writable: false, configurable: true });
      video.dispatchEvent(new Event('pause'));

      expect(store.state.paused).toBe(true);
    });

    it('updates on ended event', () => {
      const { host, video } = createMockVideoHost({ ended: false });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.ended).toBe(false);

      // Update mock to ended state
      Object.defineProperty(video, 'ended', { value: true, writable: false, configurable: true });
      video.dispatchEvent(new Event('ended'));

      expect(store.state.ended).toBe(true);
    });

    it('clears ended state on seeked event', () => {
      const { host, video } = createMockVideoHost({ ended: true });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.ended).toBe(true);

      // Simulate seeking: browser clears ended when user seeks
      Object.defineProperty(video, 'ended', { value: false, writable: false, configurable: true });
      video.dispatchEvent(new Event('seeked'));

      expect(store.state.ended).toBe(false);
    });

    it('stops listening when store is destroyed', () => {
      const { host, video } = createMockVideoHost({});

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      store.destroy();

      // Update mock to playing state
      Object.defineProperty(video, 'paused', { value: false, writable: false, configurable: true });
      video.dispatchEvent(new Event('play'));

      // State should not update after destroy
      expect(store.state.paused).toBe(true);
    });
  });

  describe('actions', () => {
    it('play() calls play on target', async () => {
      const { host, video } = createMockVideoHost({});
      video.play = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      await store.play();

      expect(video.play).toHaveBeenCalled();
    });

    it('pause() calls pause on target', () => {
      const { host, video } = createMockVideoHost({});
      video.pause = vi.fn();

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: host, container: null });

      store.pause();

      expect(video.pause).toHaveBeenCalled();
    });
  });
});
