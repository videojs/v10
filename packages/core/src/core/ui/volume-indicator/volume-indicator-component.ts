import { defineComponent } from '@videojs/compiler';
import type { VolumeIndicatorProps } from '../input-feedback/volume-indicator-core';
import { VolumeIndicatorDataAttrs } from '../input-feedback/volume-indicator-data-attrs';

export default defineComponent<VolumeIndicatorProps>()({
  name: 'VolumeIndicator',
  parts: ['Root', 'Fill', 'Value'] as const,
  dataAttrs: VolumeIndicatorDataAttrs,
});
