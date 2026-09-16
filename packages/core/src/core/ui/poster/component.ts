import { defineComponent } from 'vjsc/components';

import type { PosterImageProps } from './core';
import { PosterDataAttrs } from './data';

export default defineComponent({
  name: 'Poster',
  root: 'Root',
  parts: {
    Root: defineComponent(),
    Image: defineComponent<PosterImageProps>(),
  },
  dataAttrs: PosterDataAttrs,
});
