import type { MediaSeekCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Moving through a timeline. Media with no addressable position (a live-only embed, an animated image) skips it. */
export const seekCapability = defineMediaCapability<MediaSeekCapability>()({
  name: 'seek',
  events: ['timeupdate', 'durationchange', 'seeking', 'seeked', 'loadedmetadata'],
  attributes: {
    loop: { type: Boolean },
  },
  props: {
    currentTime: { fallback: 0 },
    loop: { fallback: false },
    duration: { fallback: Number.NaN, readonly: true },
    seeking: { fallback: false, readonly: true },
  },
});
