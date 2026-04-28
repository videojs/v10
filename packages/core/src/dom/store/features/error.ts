import { listen } from '@videojs/utils/dom';
import { isMediaErrorCapable } from '../../../core/media/predicate';
import type { MediaErrorState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const errorFeature = definePlayerFeature({
  name: 'error',
  state: ({ set }): MediaErrorState => ({
    error: null,
    dismissError() {
      set({ error: null });
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaErrorCapable(media)) return;

    const syncError = () => set({ error: media.error });

    listen(media, 'error', syncError, { signal });

    // Reset error state when a new source is loaded.
    listen(media, 'emptied', () => set({ error: null }), { signal });
  },
});
