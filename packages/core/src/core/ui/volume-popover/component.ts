import { defineComponent } from 'vjsc/components';

import type { VolumePopoverProps } from './core';
import { VolumePopoverDataAttrs } from './data';

export default defineComponent({
  name: 'VolumePopover',
  root: 'Root',
  parts: {
    Root: defineComponent<VolumePopoverProps>(),
    Trigger: defineComponent(),
    Popup: defineComponent(),
  },
  dataAttrs: VolumePopoverDataAttrs,
});
