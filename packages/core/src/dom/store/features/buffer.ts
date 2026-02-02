import type { InferSliceState } from '@videojs/store';
import { listen, serializeTimeRanges } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';

export const bufferFeature = definePlayerFeature({
  state: () => ({
    /** Buffered time ranges as [start, end] tuples. */
    buffered: [] as [number, number][],
    /** Seekable time ranges as [start, end] tuples. */
    seekable: [] as [number, number][],
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

export type BufferState = InferSliceState<typeof bufferFeature>;
