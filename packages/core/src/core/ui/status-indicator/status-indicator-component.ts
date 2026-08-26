import { defineComponent } from 'vjsc/components';

import type { StatusIndicatorProps } from './core';
import { StatusIndicatorDataAttrs } from './data';

export default defineComponent({
  name: 'StatusIndicator',
  root: 'Root',
  parts: {
    Root: defineComponent<StatusIndicatorProps>(),
    Value: defineComponent(),
  },
  dataAttrs: StatusIndicatorDataAttrs,
});
