import { defineComponent } from '../manifest';
import type { TooltipProps } from './props';
import { TooltipDataAttrs } from './tooltip-data-attrs';

export default defineComponent({
  name: 'Tooltip',
  parts: {
    Provider: defineComponent(),
    Root: defineComponent<TooltipProps>(),
    Trigger: defineComponent(),
    Popup: defineComponent(),
    Arrow: defineComponent(),
    Label: defineComponent(),
    Shortcut: defineComponent(),
  },
  dataAttrs: TooltipDataAttrs,
});
