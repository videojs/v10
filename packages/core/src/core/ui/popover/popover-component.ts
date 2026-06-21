import { defineComponent, defineComponentPart } from '../manifest';
import { PopoverDataAttrs } from './popover-data-attrs';
import type { PopoverProps } from './props';

export default defineComponent()({
  name: 'Popover',
  parts: {
    Root: defineComponentPart<PopoverProps>(),
    Trigger: defineComponentPart(),
    Popup: defineComponentPart(),
    Arrow: defineComponentPart(),
  },
  dataAttrs: PopoverDataAttrs,
});
