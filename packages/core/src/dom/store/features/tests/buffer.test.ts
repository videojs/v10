import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';

import { bufferFeature } from '../buffer';

describe('bufferFeature', () => {
  describe('attach', () => {
    it('syncs buffered and seekable ranges on attach', () => {
      const video = createMockVideo({
        buffered: createTimeRanges([[0, 60]]),
        seekable: createTimeRanges([[0, 120]]),
      });

      const store = createStore({ features: [bufferFeature] });
      store.attach({ media: video, container: null });

      expect(store.state.buffered).toEqual([[0, 60]]);
      expect(store.state.seekable).toEqual([[0, 120]]);
    });

    it('handles multiple ranges', () => {
      const video = createMockVideo({
        buffered: createTimeRanges([
          [0, 30],
          [60, 90],
        ]),
        seekable: createTimeRanges([[0, 120]]),
      });

      const store = createStore({ features: [bufferFeature] });
      store.attach({ media: video, container: null });

      expect(store.state.buffered).toEqual([
        [0, 30],
        [60, 90],
      ]);
    });

    it('updates on progress event', () => {
      const video = createMockVideo({
        buffered: createTimeRanges([[0, 50]]),
        seekable: createTimeRanges([[0, 100]]),
      });

      const store = createStore({ features: [bufferFeature] });
      store.attach({ media: video, container: null });

      // Update the mock video's buffered range
      Object.defineProperty(video, 'buffered', {
        value: createTimeRanges([[0, 75]]),
        writable: false,
        configurable: true,
      });

      video.dispatchEvent(new Event('progress'));

      expect(store.state.buffered).toEqual([[0, 75]]);
    });

    it('updates on emptied event', () => {
      const video = createMockVideo({
        buffered: createTimeRanges([[0, 50]]),
        seekable: createTimeRanges([[0, 100]]),
      });

      const store = createStore({ features: [bufferFeature] });
      store.attach({ media: video, container: null });

      // Update the mock video to have no buffered content
      Object.defineProperty(video, 'buffered', {
        value: createTimeRanges([]),
        writable: false,
        configurable: true,
      });
      Object.defineProperty(video, 'seekable', {
        value: createTimeRanges([]),
        writable: false,
        configurable: true,
      });

      video.dispatchEvent(new Event('emptied'));

      expect(store.state.buffered).toEqual([]);
      expect(store.state.seekable).toEqual([]);
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
    Object.defineProperty(video, 'buffered', { value: overrides.buffered, writable: false, configurable: true });
  }
  if (overrides.seekable !== undefined) {
    Object.defineProperty(video, 'seekable', { value: overrides.seekable, writable: false, configurable: true });
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
