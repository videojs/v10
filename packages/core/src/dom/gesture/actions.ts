import { isFunction, isUndefined } from '@videojs/utils/predicate';

import type { AnyPlayerStore } from '../media/types';
import { selectPlaybackRate, selectTime, selectVolume } from '../store/selectors';

export type GestureActionName =
  | 'togglePaused'
  | 'toggleMuted'
  | 'toggleFullscreen'
  | 'toggleSubtitles'
  | 'togglePictureInPicture'
  | 'toggleControls'
  | 'seekStep'
  | 'volumeStep'
  | 'speedUp'
  | 'speedDown';

export interface GestureActionContext {
  store: AnyPlayerStore;
  value?: number | undefined;
  event: PointerEvent;
}

export type GestureActionResolver = (context: GestureActionContext) => void;

/** Actions that need custom logic beyond `store.state[action]()`. */
const GESTURE_ACTION_OVERRIDES: Partial<Record<GestureActionName, GestureActionResolver>> = {
  seekStep({ store, value }) {
    if (isUndefined(value)) return;
    const time = selectTime(store.state);
    if (!time) return;
    time.seek(time.currentTime + value);
  },

  volumeStep({ store, value }) {
    if (isUndefined(value)) return;
    const vol = selectVolume(store.state);
    if (!vol) return;
    vol.setVolume(vol.volume + value);
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

export function resolveGestureAction(name: GestureActionName | (string & {})): GestureActionResolver | undefined {
  const override = GESTURE_ACTION_OVERRIDES[name as GestureActionName];
  if (override) return override;

  // Direct store method call — togglePaused, toggleMuted, toggleFullscreen, etc.
  return ({ store }) => {
    const method = (store.state as Record<string, unknown>)[name];
    if (isFunction(method)) method();
    else if (__DEV__) console.warn(`[vjs-gesture] Unknown action: "${name}"`);
  };
}
