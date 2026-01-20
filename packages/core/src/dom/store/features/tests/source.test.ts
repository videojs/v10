import { describe, expect, it, vi } from 'vitest';

import { sourceFeature } from '../source';

describe('sourceFeature', () => {
  describe('feature structure', () => {
    it('has unique id symbol', () => {
      expect(sourceFeature.id).toBeTypeOf('symbol');
    });

    it('has correct initial state', () => {
      expect(sourceFeature.initialState).toEqual({
        source: null,
        canPlay: false,
      });
    });

    it('has changeSource request handler', () => {
      expect(sourceFeature.request.changeSource).toBeDefined();
      expect(sourceFeature.request.changeSource).toMatchObject({
        key: 'changeSource',
        guard: [],
        handler: expect.any(Function),
      });
    });
  });

  describe('getSnapshot', () => {
    it('captures source state from video element', () => {
      const video = createMockVideo({
        currentSrc: 'https://example.com/video.mp4',
        src: 'https://example.com/video.mp4',
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const snapshot = sourceFeature.getSnapshot({
        target: video,
        initialState: sourceFeature.initialState,
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
        initialState: sourceFeature.initialState,
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

      sourceFeature.subscribe({ target: video, update, signal: controller.signal });
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

      sourceFeature.subscribe({ target: video, update, signal: controller.signal });
      video.dispatchEvent(new Event('loadstart'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on emptied event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      sourceFeature.subscribe({ target: video, update, signal: controller.signal });
      video.dispatchEvent(new Event('emptied'));

      expect(update).toHaveBeenCalled();
    });
  });

  describe('request handlers', () => {
    describe('changeSource', () => {
      it('sets src on target and calls load', () => {
        const video = createMockVideo({});
        video.load = vi.fn();

        const result = sourceFeature.request.changeSource.handler('https://example.com/new.mp4', {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

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
  }>,
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
