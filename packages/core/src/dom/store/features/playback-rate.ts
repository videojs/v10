import { listen } from '@videojs/utils/dom';

import type { MediaPlaybackRateState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

const DEFAULT_RATES: readonly number[] = [0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2];

export const playbackRateFeature = definePlayerFeature({
  name: 'playbackRate',
  state: ({ target }): MediaPlaybackRateState => ({
    playbackRates: DEFAULT_RATES,
    playbackRate: 1,
    setPlaybackRate(rate: number) {
      target().media.playbackRate = rate;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    const sync = () => set({ playbackRate: media.playbackRate });
    sync();

    listen(media, 'ratechange', sync, { signal });
  },
});
