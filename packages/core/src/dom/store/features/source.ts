import type { InferSliceState } from '@videojs/store';
import { CANCEL_ALL } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';

export const sourceFeature = definePlayerFeature({
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
          target.media.src = src;
          target.media.load();
          return src;
        },
      });
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    const sync = () =>
      set({
        source: media.currentSrc || media.src || null,
        canPlay: media.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

    sync();

    listen(media, 'canplay', sync, { signal });
    listen(media, 'canplaythrough', sync, { signal });
    listen(media, 'loadstart', sync, { signal });
    listen(media, 'emptied', sync, { signal });
  },
});

export type SourceState = InferSliceState<typeof sourceFeature>;
