import { listen } from '@videojs/utils/dom';

import type { SourceState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const sourceFeature = definePlayerFeature({
  state: ({ target, abort }): SourceState => ({
    source: null,
    canPlay: false,
    loadSource(src: string) {
      abort(); // Cancel pending operations (e.g., seek)

      const { media } = target();
      media.src = src;
      media.load();

      return src;
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
