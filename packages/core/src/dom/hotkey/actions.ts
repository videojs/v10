import { isUndefined } from '@videojs/utils/predicate';
import type { AnyPlayerStore } from '../media/types';
import { MEDIA_INPUT_ACTION_OVERRIDES } from '../media-actions';
import {
  selectFullscreen,
  selectPiP,
  selectPlayback,
  selectTextTrack,
  selectTime,
  selectVolume,
} from '../store/selectors';

/** Built-in hotkey action names. */
export type HotkeyActionName =
  | 'togglePaused'
  | 'toggleMuted'
  | 'toggleFullscreen'
  | 'toggleSubtitles'
  | 'togglePictureInPicture'
  | 'seekStep'
  | 'volumeStep'
  | 'speedUp'
  | 'speedDown'
  | 'seekToPercent';

/** Context passed to a hotkey action resolver. */
export interface HotkeyActionContext {
  /** Player store backing the hotkey. */
  store: AnyPlayerStore;
  /** Optional numeric argument supplied by the binding. */
  value?: number | undefined;
  /** The matched key character (used by `seekToPercent` to derive digit). */
  key: string;
}

/** Function that applies a hotkey action to the player store. */
export type HotkeyActionResolver = (context: HotkeyActionContext) => void;

/** Whether `action` is a toggle-style hotkey (e.g. `togglePaused`). */
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

  togglePictureInPicture({ store }) {
    const pip = selectPiP(store.state);
    if (!pip) return;
    pip.pip ? pip.exitPictureInPicture() : pip.requestPictureInPicture();
  },

  seekStep: MEDIA_INPUT_ACTION_OVERRIDES.seekStep,

  volumeStep: MEDIA_INPUT_ACTION_OVERRIDES.volumeStep,

  speedUp: MEDIA_INPUT_ACTION_OVERRIDES.speedUp,

  speedDown: MEDIA_INPUT_ACTION_OVERRIDES.speedDown,

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

/**
 * Resolve a hotkey action by name to a function that applies it to the store.
 *
 * @param name - Action name; built-in or custom.
 */
export function resolveHotkeyAction(name: string): HotkeyActionResolver | undefined {
  const resolver = HOTKEY_ACTIONS[name as HotkeyActionName];

  if (__DEV__ && !resolver) {
    console.warn(`[vjs-hotkey] Unknown action: "${name}"`);
  }

  return resolver;
}
