import { listen } from '@videojs/utils/dom';
import { isNumber } from '@videojs/utils/predicate';
import { isMediaPlaybackRateCapable } from '../../../core/media/predicate';
import type { MediaPlaybackRateState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { getUserPreference, setUserPreference } from './user-preferences';

const DEFAULT_RATES: readonly number[] = [0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2];
const DEFAULT_RATE = 1;
const PREF_KEY = 'playbackRate';
const UNSET = Symbol('unset');

export const playbackRateFeature = definePlayerFeature({
  name: 'playbackRate',
  state: ({ target, get }): MediaPlaybackRateState => ({
    playbackRates: DEFAULT_RATES,
    playbackRate: 1,
    setPlaybackRate(rate: number) {
      const { media } = target();
      if (!isMediaPlaybackRateCapable(media)) return;

      media.playbackRate = rate;
      if (isValidRate(rate)) setUserPreference(get(), PREF_KEY, rate);
    },
  }),

  attach({ target, signal, set, store }) {
    const { media } = target;

    if (!isMediaPlaybackRateCapable(media)) return;

    let applying = false;
    let lastPreference: unknown = UNSET;

    const apply = () => {
      const rate = getUserPreference(store.state, PREF_KEY);
      if (Object.is(rate, lastPreference)) return;
      const hadPreference = lastPreference !== UNSET;
      lastPreference = rate;
      if (rate === undefined) {
        if (hadPreference) setRate(DEFAULT_RATE);
        return;
      }
      if (!isValidRate(rate)) return;

      const { playbackRates } = store.state;
      if (Array.isArray(playbackRates) && !playbackRates.includes(rate)) return;

      setRate(rate);
    };

    const setRate = (rate: number) => {
      applying = true;
      media.playbackRate = rate;
      set({ playbackRate: media.playbackRate });
      applying = false;
    };

    const sync = () => {
      set({ playbackRate: media.playbackRate });
      if (!applying && isValidRate(media.playbackRate)) {
        setUserPreference(store.state, PREF_KEY, media.playbackRate);
      }
    };

    const unsubscribe = store.subscribe(apply);
    signal.addEventListener('abort', unsubscribe, { once: true });

    set({ playbackRate: media.playbackRate });
    apply();

    listen(media, 'ratechange', sync, { signal });
  },
});

function isValidRate(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value) && value > 0;
}
