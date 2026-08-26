import { defineComponent } from 'vjsc/components';

import type { TooltipProps } from './core';
import { TooltipDataAttrs } from './data';
import type { TooltipGroupProps } from './group-core';

export default defineComponent({
  name: 'Tooltip',
  root: 'Root',
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
