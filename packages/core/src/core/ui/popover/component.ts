import { defineComponent } from 'vjsc/components';

import type { PopoverProps } from './core';
import { PopoverDataAttrs } from './data';

export default defineComponent({
  name: 'Popover',
  root: 'Root',
  parts: {
    Root: defineComponent<PopoverProps>({ element: false }),
    Trigger: defineComponent(),
    Popup: defineComponent(),
    Arrow: defineComponent(),
  },
  dataAttrs: PopoverDataAttrs,
});
