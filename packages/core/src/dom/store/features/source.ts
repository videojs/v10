import type { InferFeatureState } from '@videojs/store';

import { CANCEL_ALL, defineFeature } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

export const sourceFeature = defineFeature<HTMLMediaElement>()({
  state: ({ task }) => ({
    /** Current media source URL (null if none). */
    source: null as string | null,
    /** Whether enough data is loaded to begin playback. */
    canPlay: false,
    /** Load a new media source. Cancels all pending operations. Returns the new source URL. */
    loadSource(src: string) {
      return task({
        key: 'source',
        cancels: [CANCEL_ALL],
        handler({ target }) {
          target.src = src;
          target.load();
          return src;
        },
      });
    },
  }),

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
});

export type SourceState = InferFeatureState<typeof sourceFeature>;
