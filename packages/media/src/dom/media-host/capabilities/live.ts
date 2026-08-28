import type { MediaLiveCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Describing the live window a stream exposes. */
export const liveCapability = defineMediaCapability<MediaLiveCapability>()({
  name: 'live',
  events: ['targetlivewindowchange'],
  props: {
    liveEdgeStart: { fallback: Number.NaN, readonly: true },
    targetLiveWindow: { fallback: Number.NaN, readonly: true },
  },
});
