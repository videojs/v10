import type { MediaControlsCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** The media's own native controls. */
export const controlsCapability = defineMediaCapability<MediaControlsCapability>()({
  name: 'controls',
  events: [],
  attributes: {
    controls: { type: Boolean },
  },
  props: {
    controls: { fallback: false },
  },
});
