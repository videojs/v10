import type { InferSliceRequests, InferSliceState } from '@videojs/store';

import { createSlice } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

/**
 * Source slice for HTMLMediaElement.
 *
 * Tracks current source and loading state, provides source change control.
 */
export const sourceSlice = createSlice<HTMLMediaElement>()({
  initialState: {
    /** Current media source URL (null if none). */
    source: null as string | null,
    /** Whether enough data is loaded to begin playback. */
    canPlay: false,
  },

  getSnapshot: ({ target }) => ({
    source: target.currentSrc || target.src || null,
    canPlay: target.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA,
  }),

  subscribe: ({ target, update, signal }) => {
    listen(target, 'canplay', update, { signal });
    listen(target, 'canplaythrough', update, { signal });
    listen(target, 'loadstart', update, { signal });
    listen(target, 'emptied', update, { signal });
  },

  request: {
    /** Change media source and begin loading. Returns the new source URL. */
    changeSource: (src: string, { target }) => {
      target.src = src;
      target.load();
      return src;
    },
  },
});

export type SourceState = InferSliceState<typeof sourceSlice>;

export type SourceRequests = InferSliceRequests<typeof sourceSlice>;
