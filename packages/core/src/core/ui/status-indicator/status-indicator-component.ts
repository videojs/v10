import { defineComponent } from '@videojs/compiler';
import type { StatusIndicatorProps } from '../input-feedback/status-indicator-core';
import { StatusIndicatorDataAttrs } from '../input-feedback/status-indicator-data-attrs';

export default defineComponent<StatusIndicatorProps>()({
  name: 'StatusIndicator',
  parts: ['Root', 'Value'] as const,
  dataAttrs: StatusIndicatorDataAttrs,
});
