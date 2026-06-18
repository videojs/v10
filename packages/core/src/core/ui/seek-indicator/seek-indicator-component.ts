import { defineComponent } from '@videojs/compiler';
import type { SeekIndicatorProps } from '../input-feedback/seek-indicator-core';
import { SeekIndicatorDataAttrs } from '../input-feedback/seek-indicator-data-attrs';

export default defineComponent<SeekIndicatorProps>()({
  name: 'SeekIndicator',
  parts: ['Root', 'Value'] as const,
  dataAttrs: SeekIndicatorDataAttrs,
});
