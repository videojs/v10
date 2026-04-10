import { isUndefined } from '@videojs/utils/predicate';

import type { AnyPlayerStore } from '../media/types';
import {
  selectFullscreen,
  selectPiP,
  selectPlayback,
  selectPlaybackRate,
  selectTextTrack,
  selectTime,
  selectVolume,
} from '../store/selectors';

export type HotkeyActionName =
  | 'togglePaused'
  | 'toggleMuted'
  | 'toggleFullscreen'
  | 'toggleSubtitles'
  | 'togglePiP'
  | 'seekStep'
  | 'volumeStep'
  | 'speedUp'
  | 'speedDown'
  | 'seekToPercent';

export interface HotkeyActionContext {
  store: AnyPlayerStore;
  value?: number | undefined;
  /** The matched key character (used by `seekToPercent` to derive digit). */
  key: string;
}

export type HotkeyActionResolver = (context: HotkeyActionContext) => void;

export function isHotkeyToggleAction(action: string): boolean {
  return action.startsWith('toggle');
}

const HOTKEY_ACTIONS: Record<HotkeyActionName, HotkeyActionResolver> = {
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

  seekToPercent({ store, value, key }) {
    const time = selectTime(store.state);
    if (!time || time.duration <= 0) return;

    let percent: number;

    if (!isUndefined(value)) {
      percent = value;
    } else if (key >= '0' && key <= '9') {
      percent = Number(key) * 10;
    } else {
      return;
    }

    time.seek((percent / 100) * time.duration);
  },
};

export function resolveHotkeyAction(name: string): HotkeyActionResolver | undefined {
  const resolver = HOTKEY_ACTIONS[name as HotkeyActionName];

  if (__DEV__ && !resolver) {
    console.warn(`[vjs-hotkey] Unknown action: "${name}"`);
  }

  return resolver;
}
