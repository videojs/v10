import type { MediaPosterCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** A still image standing in for the content before playback. */
export const posterCapability = defineMediaCapability<MediaPosterCapability>()({
  name: 'poster',
  events: [],
  attributes: {
    poster: { type: String, empty: '' },
  },
  props: {
    poster: { fallback: '' },
  },
});
