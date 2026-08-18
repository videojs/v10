import { defineComponent } from '@videojs/jsx';
import type { TooltipProps } from './tooltip-core';
import { TooltipDataAttrs } from './tooltip-data-attrs';
import type { TooltipGroupProps } from './tooltip-group-core';

export default defineComponent({
  name: 'Tooltip',
  parts: {
    Provider: defineComponent<TooltipGroupProps>(),
    Root: defineComponent<TooltipProps>(),
    Trigger: defineComponent(),
    Popup: defineComponent(),
    Arrow: defineComponent(),
    Label: defineComponent(),
    Shortcut: defineComponent(),
  },
  dataAttrs: TooltipDataAttrs,
});
