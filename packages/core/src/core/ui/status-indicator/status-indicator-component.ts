import { defineComponent } from 'vjsc/components';

import type { StatusIndicatorProps } from './status-indicator-core';
import { StatusIndicatorDataAttrs } from './status-indicator-data-attrs';

export default defineComponent({
  name: 'StatusIndicator',
  root: 'Root',
  parts: {
    Root: defineComponent<StatusIndicatorProps>(),
    Value: defineComponent(),
  },
  dataAttrs: StatusIndicatorDataAttrs,
});
