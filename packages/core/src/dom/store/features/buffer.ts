import type { InferFeatureState } from '@videojs/store';

import { defineFeature } from '@videojs/store';
import { listen, serializeTimeRanges } from '@videojs/utils/dom';

import type { PlayerTarget } from '../../types';

export const bufferFeature = defineFeature<PlayerTarget>()({
  state: () => ({
    /** Buffered time ranges as [start, end] tuples. */
    buffered: [] as [number, number][],
    /** Seekable time ranges as [start, end] tuples. */
    seekable: [] as [number, number][],
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    const sync = () =>
      set({
        buffered: serializeTimeRanges(media.buffered),
        seekable: serializeTimeRanges(media.seekable),
      });

    sync();

    listen(media, 'progress', sync, { signal });
    listen(media, 'emptied', sync, { signal });
  },
});

export type BufferState = InferFeatureState<typeof bufferFeature>;
