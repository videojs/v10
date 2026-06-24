import { defineComponent } from '../manifest';
import type { ThumbnailProps } from './props';
import { ThumbnailDataAttrs } from './thumbnail-data-attrs';

export default defineComponent<ThumbnailProps>({
  name: 'Thumbnail',
  dataAttrs: ThumbnailDataAttrs,
});
