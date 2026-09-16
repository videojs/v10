import { defineComponent } from 'vjsc/components';

import type { SeekIndicatorProps } from './core';
import { SeekIndicatorDataAttrs } from './data';

export default defineComponent({
  name: 'SeekIndicator',
  root: 'Root',
  parts: {
    Root: defineComponent<SeekIndicatorProps>(),
    Value: defineComponent(),
  },
  dataAttrs: SeekIndicatorDataAttrs,
});
