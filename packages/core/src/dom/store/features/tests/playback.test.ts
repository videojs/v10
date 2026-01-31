import { createStore } from '@videojs/store';
import { noop } from '@videojs/utils/function';
import { describe, expect, it, vi } from 'vitest';

import type { PlaybackState } from '../playback';
import { playbackFeature } from '../playback';

const mockState = () =>
  ({
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    play: noop,
    pause: noop,
  }) as unknown as PlaybackState;

describe('playbackFeature', () => {
  describe('getSnapshot', () => {
    it('captures current playback state from video element', () => {
      const video = createMockVideo({
        paused: false,
        ended: false,
        currentTime: 30,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const snapshot = playbackFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
      });

      expect(snapshot).toEqual({
        paused: false,
        ended: false,
        started: true,
        waiting: false,
      });
    });

    it('detects waiting state when buffering', () => {
      const video = createMockVideo({
        paused: false,
        readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      });

      const snapshot = playbackFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
      });

      expect(snapshot.waiting).toBe(true);
    });

    it('detects started from currentTime', () => {
      const video = createMockVideo({
        paused: true,
        currentTime: 5,
      });

      const snapshot = playbackFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
      });

      expect(snapshot.started).toBe(true);
    });

    it('detects started from playing state', () => {
      const video = createMockVideo({
        paused: false,
        currentTime: 0,
      });

      const snapshot = playbackFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
      });

      expect(snapshot.started).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('calls update on play event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      playbackFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('play'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on pause event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      playbackFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('pause'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on ended event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      playbackFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('ended'));

      expect(update).toHaveBeenCalled();
    });

    it('unsubscribes when signal aborted', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      playbackFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      controller.abort();
      video.dispatchEvent(new Event('play'));

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    it('play() calls play on target', async () => {
      const video = createMockVideo({});
      video.play = vi.fn().mockResolvedValue(undefined);

      const store = createStore({ features: [playbackFeature] });
      store.attach(video);

      await store.play();

      expect(video.play).toHaveBeenCalled();
    });

    it('pause() calls pause on target', () => {
      const video = createMockVideo({});
      video.pause = vi.fn();

      const store = createStore({ features: [playbackFeature] });
      store.attach(video);

      store.pause();

      expect(video.pause).toHaveBeenCalled();
    });
  });
});

function createMockVideo(
  overrides: Partial<{
    paused: boolean;
    ended: boolean;
    currentTime: number;
    readyState: number;
  }>
): HTMLVideoElement {
  const video = document.createElement('video');

  if (overrides.paused !== undefined) {
    Object.defineProperty(video, 'paused', { value: overrides.paused, writable: false });
  }
  if (overrides.ended !== undefined) {
    Object.defineProperty(video, 'ended', { value: overrides.ended, writable: false });
  }
  if (overrides.currentTime !== undefined) {
    video.currentTime = overrides.currentTime;
  }
  if (overrides.readyState !== undefined) {
    Object.defineProperty(video, 'readyState', { value: overrides.readyState, writable: false });
  }

  return video;
}
