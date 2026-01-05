import type { InferSliceRequests, InferSliceState } from '@videojs/store';

import { createSlice } from '@videojs/store';
import { listen, serializeTimeRanges } from '@videojs/utils/dom';

/**
 * Buffer slice for HTMLMediaElement.
 *
 * Tracks buffered and seekable time ranges. Read-only (no requests).
 */
export const bufferSlice = createSlice<HTMLMediaElement>()({
  initialState: {
    /** Buffered time ranges as [start, end] tuples. */
    buffered: [] as Array<[number, number]>,
    /** Seekable time ranges as [start, end] tuples. */
    seekable: [] as Array<[number, number]>,
  },

  getSnapshot: ({ target }) => ({
    buffered: serializeTimeRanges(target.buffered),
    seekable: serializeTimeRanges(target.seekable),
  }),

  subscribe: ({ target, update, signal }) => {
    const sync = () => update();
    listen(target, 'progress', sync, { signal });
    listen(target, 'emptied', sync, { signal });
  },

  request: {},
});

export type BufferState = InferSliceState<typeof bufferSlice>;

export type BufferRequests = InferSliceRequests<typeof bufferSlice>;
