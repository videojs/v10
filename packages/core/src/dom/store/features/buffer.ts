import type { InferFeatureState } from '@videojs/store';

import { defineFeature } from '@videojs/store';
import { listen, serializeTimeRanges } from '@videojs/utils/dom';

export const bufferFeature = defineFeature<HTMLMediaElement>()({
  state: () => ({
    /** Buffered time ranges as [start, end] tuples. */
    buffered: [] as [number, number][],
    /** Seekable time ranges as [start, end] tuples. */
    seekable: [] as [number, number][],
  }),

  attach({ target, signal, set }) {
    const sync = () =>
      set({
        buffered: serializeTimeRanges(target.buffered),
        seekable: serializeTimeRanges(target.seekable),
      });

    sync();

    listen(target, 'progress', sync, { signal });
    listen(target, 'emptied', sync, { signal });
  },
});

export type BufferState = InferFeatureState<typeof bufferFeature>;
