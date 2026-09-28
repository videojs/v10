import type { MediaSourceState } from '@videojs/media';
import { isMediaSourceCapable, MediaReadyState } from '@videojs/media';
import { listen } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';

/** Events after which `readyState` may have risen or fallen; the media fires none dedicated to it. */
const READY_STATE_EVENTS = [
  'loadstart',
  'emptied',
  'loadedmetadata',
  'loadeddata',
  'canplay',
  'canplaythrough',
  'playing',
  'waiting',
  'seeking',
  'seeked',
] as const;

export const sourceFeature = definePlayerFeature({
  name: 'source',
  state: ({ target, signals }): MediaSourceState => ({
    source: null,
    readyState: MediaReadyState.HAVE_NOTHING,
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
        readyState: media.readyState,
      });

    sync();

    for (const type of READY_STATE_EVENTS) {
      listen(media, type, sync, { signal });
    }
  },
});
