import { defineComponent } from 'vjsc/components';

import type { ThumbnailImageProps, ThumbnailProps } from './core';
import { ThumbnailDataAttrs } from './data';

export default defineComponent({
  name: 'Thumbnail',
  root: 'Root',
  parts: {
    Root: defineComponent<ThumbnailProps>(),
    Image: defineComponent<ThumbnailImageProps>(),
  },
  dataAttrs: ThumbnailDataAttrs,
});
