import { defineComponent } from 'vjsc/components';

import type { VolumeIndicatorProps } from './volume-indicator-core';
import { VolumeIndicatorDataAttrs } from './volume-indicator-data-attrs';

export default defineComponent({
  name: 'VolumeIndicator',
  root: 'Root',
  parts: {
    Root: defineComponent<VolumeIndicatorProps>(),
    Fill: defineComponent(),
    Value: defineComponent(),
  },
  dataAttrs: VolumeIndicatorDataAttrs,
});
