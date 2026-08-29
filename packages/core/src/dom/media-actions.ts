import { getMediaInputActionValue } from './input-action-value';
import type { MediaInputActionName } from './input-action-value';
import type { AnyPlayerStore } from './player';
import { selectPlaybackRate, selectTime, selectVolume } from './store/selectors';

export { getMediaInputActionValue } from './input-action-value';
export type { MediaInputActionName } from './input-action-value';

export interface MediaInputActionContext {
  store: AnyPlayerStore;
  value?: number | undefined;
  key?: string | undefined;
}

export type MediaInputActionResolver = (context: MediaInputActionContext) => void;

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
