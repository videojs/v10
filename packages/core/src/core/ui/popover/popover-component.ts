import { defineComponent } from '@videojs/jsx';
import type { PopoverProps } from './core';
import { PopoverDataAttrs } from './data';

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
