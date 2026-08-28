import type { MediaContentDataCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Media-owned content metadata: title, poster, storyboard, and whatever else the media can vouch for. */
export const contentDataCapability = defineMediaCapability<MediaContentDataCapability>()({
  name: 'content-data',
  events: ['contentdatachange'],
  props: {
    // `undefined` is the documented "this media reports no content data" value,
    // so it is also the value to fall back to.
    contentData: { fallback: undefined, readonly: true },
  },
});
