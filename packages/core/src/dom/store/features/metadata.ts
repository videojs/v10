import type { MediaMetadataState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const metadataFeature = definePlayerFeature({
  name: 'metadata',
  state: ({ set }): MediaMetadataState => ({
    title: null,
    setTitle(title: string | null) {
      set({ title });
    },
  }),

  attach({ signal, get, store }) {
    const session = 'mediaSession' in navigator ? navigator.mediaSession : null;
    if (!session) return;

    const sync = () => {
      const { title } = get();
      session.metadata = title ? new MediaMetadata({ title }) : null;
    };

    const unsub = store.subscribe(sync);
    signal.addEventListener(
      'abort',
      () => {
        unsub();
        session.metadata = null;
      },
      { once: true }
    );

    sync();
  },
});
