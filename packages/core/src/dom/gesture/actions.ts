import { isUndefined } from '@videojs/utils/predicate';

import type { AnyPlayerStore } from '../media/types';
import {
  selectControls,
  selectFullscreen,
  selectPiP,
  selectPlayback,
  selectPlaybackRate,
  selectTextTrack,
  selectTime,
  selectVolume,
} from '../store/selectors';

export type GestureActionName =
  | 'togglePaused'
  | 'toggleMuted'
  | 'toggleFullscreen'
  | 'toggleSubtitles'
  | 'togglePiP'
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

const GESTURE_ACTIONS: Record<GestureActionName, GestureActionResolver> = {
  togglePaused({ store }) {
    const playback = selectPlayback(store.state);
    if (!playback) return;
    playback.paused ? playback.play() : playback.pause();
  },

  toggleMuted({ store }) {
    selectVolume(store.state)?.toggleMuted();
  },

  toggleFullscreen({ store }) {
    const fs = selectFullscreen(store.state);
    if (!fs) return;
    fs.fullscreen ? fs.exitFullscreen() : fs.requestFullscreen();
  },

  toggleSubtitles({ store }) {
    selectTextTrack(store.state)?.toggleSubtitles();
  },

  togglePiP({ store }) {
    const pip = selectPiP(store.state);
    if (!pip) return;
    pip.pip ? pip.exitPictureInPicture() : pip.requestPictureInPicture();
  },

  toggleControls({ store }) {
    selectControls(store.state)?.toggleControls();
  },

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

export function resolveGestureAction(name: string): GestureActionResolver | undefined {
  const resolver = GESTURE_ACTIONS[name as GestureActionName];

  if (__DEV__ && !resolver) {
    console.warn(`[vjs-gesture] Unknown action: "${name}"`);
  }

  return resolver;
}
