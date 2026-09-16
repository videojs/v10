import { defineComponent } from 'vjsc/components';

import type { TooltipProps } from './core';
import { TooltipDataAttrs } from './data';
import type { TooltipGroupProps } from './group';

export default defineComponent({
  name: 'Tooltip',
  root: 'Root',
  parts: {
    Provider: defineComponent<TooltipGroupProps>({ element: false }),
    Root: defineComponent<TooltipProps>({ element: false }),
    Trigger: defineComponent(),
    Popup: defineComponent(),
    Arrow: defineComponent(),
    Label: defineComponent(),
    Shortcut: defineComponent(),
  },
  dataAttrs: TooltipDataAttrs,
});
