import { listen } from '@videojs/utils/dom';

import type { MediaSourceState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { isMediaSourceCapable } from '../../media/predicate';

export const sourceFeature = definePlayerFeature({
  name: 'source',
  state: ({ target, signals }): MediaSourceState => ({
    source: null,
    canPlay: false,
    loadSource(src: string) {
      signals.clear();

      const { media } = target();
      if (!isMediaSourceCapable(media)) return src;
      media.src = src;
      media.load();

      return src;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaSourceCapable(media)) return;

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
