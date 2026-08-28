import type { MediaAutoplayCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Starting playback without a gesture. */
export const autoplayCapability = defineMediaCapability<MediaAutoplayCapability>()({
  name: 'autoplay',
  events: [],
  attributes: {
    autoplay: { type: Boolean },
  },
  props: {
    autoplay: { fallback: false },
  },
});
