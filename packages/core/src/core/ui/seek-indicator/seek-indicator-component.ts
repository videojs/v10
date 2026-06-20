import type { SeekIndicatorProps } from '../input-feedback/seek-indicator-core';
import { SeekIndicatorDataAttrs } from '../input-feedback/seek-indicator-data-attrs';
import { defineComponent } from '../manifest';

export default defineComponent<SeekIndicatorProps>()({
  name: 'SeekIndicator',
  parts: ['Root', 'Value'] as const,
  dataAttrs: SeekIndicatorDataAttrs,
});
