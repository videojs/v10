import { defineComponent } from '@videojs/jsx';

import type { SeekIndicatorProps } from './seek-indicator-core';
import { SeekIndicatorDataAttrs } from './seek-indicator-data-attrs';

export default defineComponent({
  name: 'SeekIndicator',
  parts: {
    Root: defineComponent<SeekIndicatorProps>(),
    Value: defineComponent(),
  },
  dataAttrs: SeekIndicatorDataAttrs,
});
