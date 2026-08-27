import { isUndefined } from '@videojs/utils/predicate';

import { DEFAULT_SEEK_STEP, DEFAULT_VOLUME_STEP } from '../core/ui/constants';
import type { AnyPlayerStore } from './player';
import { selectPlaybackRate, selectTime, selectVolume } from './store/selectors';

export type MediaInputActionName = 'seekStep' | 'volumeStep' | 'speedUp' | 'speedDown';

export interface MediaInputActionContext {
  store: AnyPlayerStore;
  value?: number | undefined;
  key?: string | undefined;
}

export type MediaInputActionResolver = (context: MediaInputActionContext) => void;

export function getMediaInputActionValue(
  action: string,
  key: string | undefined,
  value?: number | undefined
): number | undefined {
  if (!isUndefined(value)) return value;

  const normalizedKey = key?.toLowerCase();

  if (action === 'seekStep') {
    return normalizedKey === 'arrowleft' || normalizedKey === 'j' ? -DEFAULT_SEEK_STEP : DEFAULT_SEEK_STEP;
  }

  if (action === 'volumeStep') {
    const step = DEFAULT_VOLUME_STEP / 100;

    return normalizedKey === 'arrowdown' ? -step : step;
  }

  return undefined;
}

export const MEDIA_INPUT_ACTION_OVERRIDES: Record<MediaInputActionName, MediaInputActionResolver> = {
  seekStep({ store, value, key }) {
    const step = getMediaInputActionValue('seekStep', key, value)!;

    const time = selectTime(store.state);
    if (!time) return;

    time.seek(time.currentTime + step);
  },

  volumeStep({ store, value, key }) {
    const step = getMediaInputActionValue('volumeStep', key, value)!;

    const vol = selectVolume(store.state);
    if (!vol) return;

    vol.setVolume(vol.volume + step);
  },

  speedUp({ store }) {
    const rate = selectPlaybackRate(store.state);
    if (!rate) return;

    const { playbackRates, playbackRate } = rate;
    const idx = playbackRates.indexOf(playbackRate);
    const next = idx < 0 || idx >= playbackRates.length - 1 ? 0 : idx + 1;

    rate.setPlaybackRate(playbackRates[next]!);
  },

  speedDown({ store }) {
    const rate = selectPlaybackRate(store.state);
    if (!rate) return;

    const { playbackRates, playbackRate } = rate;
    const idx = playbackRates.indexOf(playbackRate);
    const next = idx <= 0 ? playbackRates.length - 1 : idx - 1;

    rate.setPlaybackRate(playbackRates[next]!);
  },
};
