import type { InferFeatureRequests, InferFeatureState } from '@videojs/store';

import { createFeature } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

/**
 * Source feature for HTMLMediaElement.
 *
 * Tracks current source and loading state, provides source change control.
 */
export const sourceFeature = createFeature<HTMLMediaElement>()({
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

export type SourceState = InferFeatureState<typeof sourceFeature>;

export type SourceRequests = InferFeatureRequests<typeof sourceFeature>;
