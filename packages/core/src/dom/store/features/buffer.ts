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

  getSnapshot: ({ target }) => ({
    buffered: serializeTimeRanges(target.buffered),
    seekable: serializeTimeRanges(target.seekable),
  }),

  subscribe: ({ target, update, signal }) => {
    listen(target, 'progress', update, { signal });
    listen(target, 'emptied', update, { signal });
  },
});

export type BufferState = InferFeatureState<typeof bufferFeature>;
