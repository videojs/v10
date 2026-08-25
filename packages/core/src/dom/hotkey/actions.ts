import { isUndefined } from '@videojs/utils/predicate';

import { MEDIA_INPUT_ACTION_OVERRIDES } from '../media-actions';
import type { AnyPlayerStore } from '../player';
import {
  selectFullscreen,
  selectPiP,
  selectPlayback,
  selectTextTrack,
  selectTime,
  selectVolume,
} from '../store/selectors';

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

const HOTKEY_ACTIONS = {
  togglePaused({ store }) {
    const playback = selectPlayback(store.state);
    if (!playback) return;
    if (playback.paused) playback.play();
    else playback.pause();
  },

  toggleMuted({ store }) {
    selectVolume(store.state)?.toggleMuted();
  },

  toggleFullscreen({ store }) {
    const fs = selectFullscreen(store.state);
    if (!fs) return;
    if (fs.fullscreen) fs.exitFullscreen();
    else fs.requestFullscreen();
  },

  toggleSubtitles({ store }) {
    selectTextTrack(store.state)?.toggleSubtitles();
  },

  togglePictureInPicture({ store }) {
    const pip = selectPiP(store.state);
    if (!pip) return;
    if (pip.pip) pip.exitPictureInPicture();
    else pip.requestPictureInPicture();
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
} satisfies Record<HotkeyActionName, HotkeyActionResolver>;

export function resolveHotkeyAction(name: string): HotkeyActionResolver | undefined {
  const resolver =
    HOTKEY_ACTIONS[
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ name as HotkeyActionName
    ];

  if (__DEV__ && !resolver) {
    console.warn(`[vjs-hotkey] Unknown action: "${name}"`);
  }

  return resolver;
}
