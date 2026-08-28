import type { MediaPlaysInlineCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Playing in place rather than taking over the screen, which small-screen browsers otherwise do. */
export const playsInlineCapability = defineMediaCapability<MediaPlaysInlineCapability>()({
  name: 'plays-inline',
  events: [],
  attributes: {
    playsInline: { type: Boolean },
  },
  props: {
    playsInline: { fallback: false },
  },
});
