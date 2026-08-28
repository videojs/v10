import type { MediaPlaybackRateCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Playing faster or slower than real time. */
export const playbackRateCapability = defineMediaCapability<MediaPlaybackRateCapability>()({
  name: 'playback-rate',
  events: ['ratechange'],
  props: {
    playbackRate: { fallback: 1 },
    defaultPlaybackRate: { fallback: 1 },
  },
});
