import type { MediaTitleCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** An author-supplied title, distinct from the media-owned `contentData.title`. */
export const titleCapability = defineMediaCapability<MediaTitleCapability>()({
  name: 'title',
  events: [],
  props: {
    title: { fallback: '' },
  },
});
