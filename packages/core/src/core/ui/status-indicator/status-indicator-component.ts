import { StatusIndicatorDataAttrs } from '../input-feedback/status-indicator-data-attrs';
import { defineComponent, defineComponentPart } from '../manifest';
import type { StatusIndicatorProps } from './props';

export default defineComponent()({
  name: 'StatusIndicator',
  parts: {
    Root: defineComponentPart<StatusIndicatorProps>(),
    Value: defineComponentPart(),
  },
  dataAttrs: StatusIndicatorDataAttrs,
});
