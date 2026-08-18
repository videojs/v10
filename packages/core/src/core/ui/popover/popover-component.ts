import { defineComponent } from '@videojs/jsx';
import type { PopoverProps } from './popover-core';
import { PopoverDataAttrs } from './popover-data-attrs';

export default defineComponent({
  name: 'Popover',
  parts: {
    Root: defineComponent<PopoverProps>(),
    Trigger: defineComponent(),
    Popup: defineComponent(),
    Arrow: defineComponent(),
  },
  dataAttrs: PopoverDataAttrs,
});
