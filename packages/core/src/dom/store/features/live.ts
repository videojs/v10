import { listen } from '@videojs/utils/dom';

import type { MediaLiveState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { isMediaLiveCapable } from '../../media/predicate';

export const liveFeature = definePlayerFeature({
  name: 'live',
  state: (): MediaLiveState => ({
    liveEdgeStart: Number.NaN,
    targetLiveWindow: Number.NaN,
  }),

  // `liveEdgeStart` is derived from `seekable.end` and the target offset —
  // no dedicated event — so we re-read it whenever any of its inputs
  // (seekable, targetLiveWindow, streamType, currentTime) might have changed.
  //
  // `timeupdate` is what keeps the cached value moving with the live edge
  // during playback; `progress`/`canplay` cover buffer/metadata transitions.
  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaLiveCapable(media)) return;

    const sync = () =>
      set({
        liveEdgeStart: media.liveEdgeStart,
        targetLiveWindow: media.targetLiveWindow,
      });

    sync();

    listen(media, 'targetlivewindowchange', sync, { signal });
    listen(media, 'streamtypechange', sync, { signal });
    listen(media, 'loadedmetadata', sync, { signal });
    listen(media, 'canplay', sync, { signal });
    listen(media, 'progress', sync, { signal });
    listen(media, 'durationchange', sync, { signal });
    listen(media, 'timeupdate', sync, { signal });
    listen(media, 'emptied', sync, { signal });
  },
});
