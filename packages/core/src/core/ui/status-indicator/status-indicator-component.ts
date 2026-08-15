import { defineComponent } from '@videojs/jsx';

import type { StatusIndicatorProps } from './status-indicator-core';
import { StatusIndicatorDataAttrs } from './status-indicator-data-attrs';

export default defineComponent({
  name: 'StatusIndicator',
  parts: {
    Root: defineComponent<StatusIndicatorProps>(),
    Value: defineComponent(),
  },
  dataAttrs: StatusIndicatorDataAttrs,
});
