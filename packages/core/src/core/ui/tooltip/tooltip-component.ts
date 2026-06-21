import { defineComponent, defineComponentPart } from '../manifest';
import type { TooltipProps } from './props';
import { TooltipDataAttrs } from './tooltip-data-attrs';

export default defineComponent()({
  name: 'Tooltip',
  parts: {
    Provider: defineComponentPart(),
    Root: defineComponentPart<TooltipProps>(),
    Trigger: defineComponentPart(),
    Popup: defineComponentPart(),
    Arrow: defineComponentPart(),
    Label: defineComponentPart(),
    Shortcut: defineComponentPart(),
  },
  dataAttrs: TooltipDataAttrs,
});
