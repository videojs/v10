import { describe, expect, it, vi } from 'vitest';

import { playback } from '../playback';

describe('playback', () => {
  describe('slice structure', () => {
    it('has unique id symbol', () => {
      expect(playback.id).toBeTypeOf('symbol');
    });

    it('has correct initial state', () => {
      expect(playback.initialState).toEqual({
        paused: true,
        ended: false,
        started: false,
        waiting: false,
        currentTime: 0,
        duration: 0,
        buffered: [],
        seekable: [],
        volume: 1,
        muted: false,
        canPlay: false,
        source: null,
        streamType: 'unknown',
      });
    });

    it('has all request handlers', () => {
      expect(playback.request.play).toBeDefined();
      expect(playback.request.pause).toBeDefined();
      expect(playback.request.seek).toBeDefined();
      expect(playback.request.changeVolume).toBeDefined();
      expect(playback.request.toggleMute).toBeDefined();
      expect(playback.request.changeSource).toBeDefined();
    });

    it('request handlers have correct structure', () => {
      expect(playback.request.play).toMatchObject({
        key: 'play',
        guard: [],
        handler: expect.any(Function),
      });

      expect(playback.request.pause).toMatchObject({
        key: 'pause',
        guard: [],
        handler: expect.any(Function),
      });

      expect(playback.request.seek).toMatchObject({
        key: 'seek',
        guard: [],
        handler: expect.any(Function),
      });
    });
  });

  describe('getSnapshot', () => {
    it('captures current playback state from video element', () => {
      const video = createMockVideo({
        paused: false,
        ended: false,
        currentTime: 30,
        duration: 120,
        volume: 0.8,
        muted: false,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
        currentSrc: 'https://example.com/video.mp4',
        src: 'https://example.com/video.mp4',
        buffered: createTimeRanges([[0, 60]]),
        seekable: createTimeRanges([[0, 120]]),
      });

      const snapshot = playback.getSnapshot({
        target: video,
        initialState: playback.initialState,
      });

      expect(snapshot).toEqual({
        paused: false,
        ended: false,
        started: true,
        waiting: false,
        currentTime: 30,
        duration: 120,
        buffered: [[0, 60]],
        seekable: [[0, 120]],
        volume: 0.8,
        muted: false,
        canPlay: true,
        source: 'https://example.com/video.mp4',
        streamType: 'on-demand',
      });
    });

    it('detects waiting state when buffering', () => {
      const video = createMockVideo({
        paused: false,
        readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      });

      const snapshot = playback.getSnapshot({
        target: video,
        initialState: playback.initialState,
      });

      expect(snapshot.waiting).toBe(true);
    });

    it('detects started from currentTime', () => {
      const video = createMockVideo({
        paused: true,
        currentTime: 5,
      });

      const snapshot = playback.getSnapshot({
        target: video,
        initialState: playback.initialState,
      });

      expect(snapshot.started).toBe(true);
    });

    it('detects started from playing state', () => {
      const video = createMockVideo({
        paused: false,
        currentTime: 0,
      });

      const snapshot = playback.getSnapshot({
        target: video,
        initialState: playback.initialState,
      });

      expect(snapshot.started).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('subscribes to play event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      playback.subscribe({ target: video, update, signal: controller.signal });

      video.dispatchEvent(new Event('play'));

      expect(update).toHaveBeenCalledWith({ paused: false, started: true });
    });

    it('subscribes to pause event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      playback.subscribe({ target: video, update, signal: controller.signal });

      video.dispatchEvent(new Event('pause'));

      expect(update).toHaveBeenCalledWith({ paused: true });
    });

    it('subscribes to ended event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      playback.subscribe({ target: video, update, signal: controller.signal });

      video.dispatchEvent(new Event('ended'));

      expect(update).toHaveBeenCalledWith({ ended: true });
    });

    it('subscribes to timeupdate event', () => {
      const video = createMockVideo({ currentTime: 42 });
      const update = vi.fn();
      const controller = new AbortController();

      playback.subscribe({ target: video, update, signal: controller.signal });

      video.dispatchEvent(new Event('timeupdate'));

      expect(update).toHaveBeenCalledWith({ currentTime: 42 });
    });

    it('subscribes to volumechange event', () => {
      const video = createMockVideo({ volume: 0.5, muted: true });
      const update = vi.fn();
      const controller = new AbortController();

      playback.subscribe({ target: video, update, signal: controller.signal });

      video.dispatchEvent(new Event('volumechange'));

      expect(update).toHaveBeenCalledWith({ volume: 0.5, muted: true });
    });

    it('unsubscribes when signal aborted', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      playback.subscribe({ target: video, update, signal: controller.signal });

      controller.abort();

      video.dispatchEvent(new Event('play'));

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('request handlers', () => {
    describe('play', () => {
      it('calls play on target', async () => {
        const video = createMockVideo({});
        video.play = vi.fn().mockResolvedValue(undefined);

        await playback.request.play.handler(undefined, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.play).toHaveBeenCalled();
      });
    });

    describe('pause', () => {
      it('calls pause on target', () => {
        const video = createMockVideo({});
        video.pause = vi.fn();

        playback.request.pause.handler(undefined, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.pause).toHaveBeenCalled();
      });
    });

    describe('seek', () => {
      it('sets currentTime on target', () => {
        const video = createMockVideo({});

        const result = playback.request.seek.handler(45, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.currentTime).toBe(45);
        expect(result).toBe(45);
      });
    });

    describe('changeVolume', () => {
      it('sets volume on target', () => {
        const video = createMockVideo({});

        const result = playback.request.changeVolume.handler(0.7, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.volume).toBe(0.7);
        expect(result).toBe(0.7);
      });

      it('clamps volume to min 0', () => {
        const video = createMockVideo({});

        playback.request.changeVolume.handler(-0.5, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.volume).toBe(0);
      });

      it('clamps volume to max 1', () => {
        const video = createMockVideo({});

        playback.request.changeVolume.handler(1.5, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.volume).toBe(1);
      });
    });

    describe('toggleMute', () => {
      it('toggles mute from false to true', () => {
        const video = createMockVideo({ muted: false });

        const result = playback.request.toggleMute.handler(undefined, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.muted).toBe(true);
        expect(result).toBe(true);
      });

      it('toggles mute from true to false', () => {
        const video = createMockVideo({ muted: true });

        const result = playback.request.toggleMute.handler(undefined, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.muted).toBe(false);
        expect(result).toBe(false);
      });
    });

    describe('changeSource', () => {
      it('sets src on target', () => {
        const video = createMockVideo({});

        const result = playback.request.changeSource.handler('https://example.com/new.mp4', {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.src).toBe('https://example.com/new.mp4');
        expect(result).toBe('https://example.com/new.mp4');
      });
    });
  });
});

/**
 * Helper to create a mock HTMLMediaElement.
 */
function createMockVideo(
  overrides: Partial<{
    paused: boolean;
    ended: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    readyState: number;
    currentSrc: string;
    src: string;
    buffered: TimeRanges;
    seekable: TimeRanges;
  }>,
): HTMLVideoElement {
  const video = document.createElement('video');

  // Apply overrides using Object.defineProperty for read-only properties
  if (overrides.paused !== undefined) {
    Object.defineProperty(video, 'paused', { value: overrides.paused, writable: false });
  }
  if (overrides.ended !== undefined) {
    Object.defineProperty(video, 'ended', { value: overrides.ended, writable: false });
  }
  if (overrides.currentTime !== undefined) {
    video.currentTime = overrides.currentTime;
  }
  if (overrides.duration !== undefined) {
    Object.defineProperty(video, 'duration', { value: overrides.duration, writable: false });
  }
  if (overrides.volume !== undefined) {
    video.volume = overrides.volume;
  }
  if (overrides.muted !== undefined) {
    video.muted = overrides.muted;
  }
  if (overrides.readyState !== undefined) {
    Object.defineProperty(video, 'readyState', { value: overrides.readyState, writable: false });
  }
  if (overrides.currentSrc !== undefined) {
    Object.defineProperty(video, 'currentSrc', { value: overrides.currentSrc, writable: false });
  }
  if (overrides.src !== undefined) {
    video.src = overrides.src;
  }
  if (overrides.buffered !== undefined) {
    Object.defineProperty(video, 'buffered', { value: overrides.buffered, writable: false });
  }
  if (overrides.seekable !== undefined) {
    Object.defineProperty(video, 'seekable', { value: overrides.seekable, writable: false });
  }

  return video;
}

/**
 * Helper to create a mock TimeRanges object.
 */
function createTimeRanges(ranges: Array<[number, number]>): TimeRanges {
  return {
    length: ranges.length,
    start(index: number): number {
      const range = ranges[index];
      if (index < 0 || index >= ranges.length || !range) {
        throw new DOMException('Index out of range', 'IndexSizeError');
      }
      return range[0];
    },
    end(index: number): number {
      const range = ranges[index];
      if (index < 0 || index >= ranges.length || !range) {
        throw new DOMException('Index out of range', 'IndexSizeError');
      }
      return range[1];
    },
  };
}
