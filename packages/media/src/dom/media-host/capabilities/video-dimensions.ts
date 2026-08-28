import type { MediaVideoDimensionsCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Reporting the intrinsic size of the decoded video. */
export const videoDimensionsCapability = defineMediaCapability<MediaVideoDimensionsCapability>()({
  name: 'video-dimensions',
  events: ['resize'],
  props: {
    videoWidth: { fallback: 0, readonly: true },
    videoHeight: { fallback: 0, readonly: true },
  },
});
