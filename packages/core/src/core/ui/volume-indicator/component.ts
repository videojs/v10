import { defineComponent } from 'vjsc/components';

import type { VolumeIndicatorProps } from './core';
import { VolumeIndicatorDataAttrs } from './data';

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
