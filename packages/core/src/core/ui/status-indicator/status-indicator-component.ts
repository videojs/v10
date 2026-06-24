import { StatusIndicatorDataAttrs } from '../input-feedback/status-indicator-data-attrs';
import { defineComponent } from '../manifest';
import type { StatusIndicatorProps } from './props';

export default defineComponent({
  name: 'StatusIndicator',
  parts: {
    Root: defineComponent<StatusIndicatorProps>(),
    Value: defineComponent(),
  },
  dataAttrs: StatusIndicatorDataAttrs,
});
