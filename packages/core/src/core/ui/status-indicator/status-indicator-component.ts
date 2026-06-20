import type { StatusIndicatorProps } from '../input-feedback/status-indicator-core';
import { StatusIndicatorDataAttrs } from '../input-feedback/status-indicator-data-attrs';
import { defineComponent } from '../manifest';

export default defineComponent<StatusIndicatorProps>()({
  name: 'StatusIndicator',
  parts: ['Root', 'Value'] as const,
  dataAttrs: StatusIndicatorDataAttrs,
});
