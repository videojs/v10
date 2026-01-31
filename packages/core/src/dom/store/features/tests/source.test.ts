import { createStore } from '@videojs/store';
import { noop } from '@videojs/utils/function';
import { describe, expect, it, vi } from 'vitest';

import type { SourceState } from '../source';
import { sourceFeature } from '../source';

const mockState = () =>
  ({
    source: null,
    canPlay: false,
    loadSource: noop,
  }) as unknown as SourceState;

describe('sourceFeature', () => {
  describe('getSnapshot', () => {
    it('captures source state from video element', () => {
      const video = createMockVideo({
        currentSrc: 'https://example.com/video.mp4',
        src: 'https://example.com/video.mp4',
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const snapshot = sourceFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
      });

      expect(snapshot).toEqual({
        source: 'https://example.com/video.mp4',
        canPlay: true,
      });
    });

    it('returns null source when no source set', () => {
      // Note: Don't set src at all - setting src="" resolves to page URL
      const video = document.createElement('video');
      Object.defineProperty(video, 'currentSrc', { value: '', writable: false });
      Object.defineProperty(video, 'readyState', { value: HTMLMediaElement.HAVE_NOTHING, writable: false });

      const snapshot = sourceFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
      });

      expect(snapshot.source).toBe(null);
      expect(snapshot.canPlay).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('calls update on canplay event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      sourceFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('canplay'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on loadstart event', () => {
      const video = createMockVideo({
        currentSrc: 'https://example.com/new.mp4',
        src: 'https://example.com/new.mp4',
      });
      const update = vi.fn();
      const controller = new AbortController();

      sourceFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('loadstart'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on emptied event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      sourceFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('emptied'));

      expect(update).toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    describe('loadSource', () => {
      it('sets src on target and calls load', async () => {
        const video = createMockVideo({});
        video.load = vi.fn();

        const store = createStore({ features: [sourceFeature] });
        store.attach(video);

        const result = await store.loadSource('https://example.com/new.mp4');

        expect(video.src).toBe('https://example.com/new.mp4');
        expect(video.load).toHaveBeenCalled();
        expect(result).toBe('https://example.com/new.mp4');
      });
    });
  });
});

function createMockVideo(
  overrides: Partial<{
    currentSrc: string;
    src: string;
    readyState: number;
  }>
): HTMLVideoElement {
  const video = document.createElement('video');

  if (overrides.currentSrc !== undefined) {
    Object.defineProperty(video, 'currentSrc', { value: overrides.currentSrc, writable: false });
  }
  if (overrides.src !== undefined) {
    video.src = overrides.src;
  }
  if (overrides.readyState !== undefined) {
    Object.defineProperty(video, 'readyState', { value: overrides.readyState, writable: false });
  }

  return video;
}
