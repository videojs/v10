import { defineComponent } from '@videojs/compiler';
import type { ThumbnailProps } from './thumbnail-core';
import { ThumbnailDataAttrs } from './thumbnail-data-attrs';

export default defineComponent<ThumbnailProps>()({
  name: 'Thumbnail',
  dataAttrs: ThumbnailDataAttrs,
});
