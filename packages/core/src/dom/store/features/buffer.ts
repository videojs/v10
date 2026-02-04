import { listen, serializeTimeRanges } from '@videojs/utils/dom';

import type { BufferState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const bufferFeature = definePlayerFeature({
  state: (): BufferState => ({
    buffered: [],
    seekable: [],
  }),

  attach({ target, signal, set }) {
    const { media } = target;

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
