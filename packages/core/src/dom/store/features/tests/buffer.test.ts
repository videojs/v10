import { describe, expect, it, vi } from 'vitest';

import { bufferFeature } from '../buffer';

describe('bufferFeature', () => {
  describe('getSnapshot', () => {
    it('captures buffered and seekable ranges from video element', () => {
      const video = createMockVideo({
        buffered: createTimeRanges([[0, 60]]),
        seekable: createTimeRanges([[0, 120]]),
      });

      const snapshot = bufferFeature.getSnapshot({
        target: video,
        get: () => ({ buffered: [], seekable: [] }),
        initialState: { buffered: [], seekable: [] },
      });

      expect(snapshot).toEqual({
        buffered: [[0, 60]],
        seekable: [[0, 120]],
      });
    });

    it('handles multiple ranges', () => {
      const video = createMockVideo({
        buffered: createTimeRanges([
          [0, 30],
          [60, 90],
        ]),
        seekable: createTimeRanges([[0, 120]]),
      });

      const snapshot = bufferFeature.getSnapshot({
        target: video,
        get: () => ({ buffered: [], seekable: [] }),
        initialState: { buffered: [], seekable: [] },
      });

      expect(snapshot.buffered).toEqual([
        [0, 30],
        [60, 90],
      ]);
    });
  });

  describe('subscribe', () => {
    it('calls update on progress event', () => {
      const video = createMockVideo({
        buffered: createTimeRanges([[0, 50]]),
        seekable: createTimeRanges([[0, 100]]),
      });
      const update = vi.fn();
      const controller = new AbortController();

      bufferFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: () => ({ buffered: [], seekable: [] }),
      });
      video.dispatchEvent(new Event('progress'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on emptied event', () => {
      const video = createMockVideo({
        buffered: createTimeRanges([]),
        seekable: createTimeRanges([]),
      });
      const update = vi.fn();
      const controller = new AbortController();

      bufferFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: () => ({ buffered: [], seekable: [] }),
      });
      video.dispatchEvent(new Event('emptied'));

      expect(update).toHaveBeenCalled();
    });
  });
});

function createMockVideo(
  overrides: Partial<{
    buffered: TimeRanges;
    seekable: TimeRanges;
  }>
): HTMLVideoElement {
  const video = document.createElement('video');

  if (overrides.buffered !== undefined) {
    Object.defineProperty(video, 'buffered', { value: overrides.buffered, writable: false });
  }
  if (overrides.seekable !== undefined) {
    Object.defineProperty(video, 'seekable', { value: overrides.seekable, writable: false });
  }

  return video;
}

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
