import { defineComponent } from '@videojs/jsx';
import type { TooltipProps } from './core';
import { TooltipDataAttrs } from './data';
import type { TooltipGroupProps } from './group-core';

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
