import type { MediaBufferState } from '@videojs/media';
import { isMediaBufferCapable } from '@videojs/media';
import { listen, serializeTimeRanges } from '@videojs/utils/dom';
import { definePlayerFeature } from '../../feature';

export const bufferFeature = definePlayerFeature({
  name: 'buffer',
  state: (): MediaBufferState => ({
    buffered: [],
    seekable: [],
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaBufferCapable(media)) return;

    const sync = () =>
      set({
        buffered: serializeTimeRanges(media.buffered),
        seekable: serializeTimeRanges(media.seekable),
      });

    sync();

    listen(media, 'progress', sync, { signal });
    listen(media, 'emptied', sync, { signal });
  },
});
