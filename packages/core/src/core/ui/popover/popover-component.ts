import { defineComponent } from '../manifest';
import type { PopoverProps } from './popover-core';
import { PopoverDataAttrs } from './popover-data-attrs';

export default defineComponent<PopoverProps>()({
  name: 'Popover',
  parts: ['Root', 'Trigger', 'Popup', 'Arrow'] as const,
  dataAttrs: PopoverDataAttrs,
});
