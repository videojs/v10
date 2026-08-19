import { defineComponent } from 'vjsc/components';

import type { SeekIndicatorProps } from './seek-indicator-core';
import { SeekIndicatorDataAttrs } from './seek-indicator-data-attrs';

export default defineComponent({
  name: 'SeekIndicator',
  root: 'Root',
  parts: {
    Root: defineComponent<SeekIndicatorProps>(),
    Value: defineComponent(),
  },
  dataAttrs: SeekIndicatorDataAttrs,
});
