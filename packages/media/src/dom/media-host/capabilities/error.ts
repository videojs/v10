import type { MediaErrorCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Reporting a fatal playback failure. */
export const errorCapability = defineMediaCapability<MediaErrorCapability>()({
  name: 'error',
  events: ['error'],
  props: {
    error: { fallback: null, readonly: true },
  },
});
