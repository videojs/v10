import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideoHost, createTimeRanges } from '../../../tests/test-helpers';
import { bufferFeature } from '../buffer';

describe('bufferFeature', () => {
  describe('attach', () => {
    it('syncs buffered and seekable ranges on attach', () => {
      const { host } = createMockVideoHost({
        buffered: createTimeRanges([[0, 60]]),
        seekable: createTimeRanges([[0, 120]]),
      });

      const store = createStore<PlayerTarget>()(bufferFeature);
      store.attach({ media: host, container: null });

      expect(store.state.buffered).toEqual([[0, 60]]);
      expect(store.state.seekable).toEqual([[0, 120]]);
    });

    it('handles multiple ranges', () => {
      const { host } = createMockVideoHost({
        buffered: createTimeRanges([
          [0, 30],
          [60, 90],
        ]),
        seekable: createTimeRanges([[0, 120]]),
      });

      const store = createStore<PlayerTarget>()(bufferFeature);
      store.attach({ media: host, container: null });

      expect(store.state.buffered).toEqual([
        [0, 30],
        [60, 90],
      ]);
    });

    it('updates on progress event', () => {
      const { host, video } = createMockVideoHost({
        buffered: createTimeRanges([[0, 50]]),
        seekable: createTimeRanges([[0, 100]]),
      });

      const store = createStore<PlayerTarget>()(bufferFeature);
      store.attach({ media: host, container: null });

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
      const { host, video } = createMockVideoHost({
        buffered: createTimeRanges([[0, 50]]),
        seekable: createTimeRanges([[0, 100]]),
      });

      const store = createStore<PlayerTarget>()(bufferFeature);
      store.attach({ media: host, container: null });

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
