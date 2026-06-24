import { defineComponent } from '../manifest';
import { PopoverDataAttrs } from './popover-data-attrs';
import type { PopoverProps } from './props';

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
