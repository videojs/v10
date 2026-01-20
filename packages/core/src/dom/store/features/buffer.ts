import type { InferFeatureRequests, InferFeatureState } from '@videojs/store';

import { createFeature } from '@videojs/store';
import { listen, serializeTimeRanges } from '@videojs/utils/dom';

/**
 * Buffer feature for HTMLMediaElement.
 *
 * Tracks buffered and seekable time ranges. Read-only (no requests).
 */
export const bufferFeature = createFeature<HTMLMediaElement>()({
  initialState: {
    /** Buffered time ranges as [start, end] tuples. */
    buffered: [] as [number, number][],
    /** Seekable time ranges as [start, end] tuples. */
    seekable: [] as [number, number][],
  },

  getSnapshot: ({ target }) => ({
    buffered: serializeTimeRanges(target.buffered),
    seekable: serializeTimeRanges(target.seekable),
  }),

  subscribe: ({ target, update, signal }) => {
    listen(target, 'progress', update, { signal });
    listen(target, 'emptied', update, { signal });
  },

  request: {},
});

export type BufferState = InferFeatureState<typeof bufferFeature>;

export type BufferRequests = InferFeatureRequests<typeof bufferFeature>;
