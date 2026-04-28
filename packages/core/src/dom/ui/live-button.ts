import type { Selector } from '@videojs/store';

import type { LiveButtonMediaState } from '../../core/ui/live-button/live-button-core';
import { liveFeature } from '../store/features/live';
import { selectBuffer, selectLive, selectTime } from '../store/selectors';

export type { LiveButtonMediaState };

/**
 * Composite selector for the LiveButton — combines `live`, `time`, and
 * `buffer` feature state so the button can both detect the live edge and
 * seek to the Seekable Live Edge when activated.
 *
 * Returns `undefined` when any of the underlying features is missing.
 */
export const selectLiveButton: Selector<object, LiveButtonMediaState | undefined> = Object.assign(
  (state: object): LiveButtonMediaState | undefined => {
    const live = selectLive(state);
    const time = selectTime(state);
    const buffer = selectBuffer(state);
    if (!live || !time || !buffer) return undefined;
    return {
      currentTime: time.currentTime,
      seek: time.seek,
      seekable: buffer.seekable,
      liveEdgeStart: live.liveEdgeStart,
      targetLiveWindow: live.targetLiveWindow,
    };
  },
  { displayName: liveFeature.name }
);
