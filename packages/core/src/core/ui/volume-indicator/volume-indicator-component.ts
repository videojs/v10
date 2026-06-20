import type { VolumeIndicatorProps } from '../input-feedback/volume-indicator-core';
import { VolumeIndicatorDataAttrs } from '../input-feedback/volume-indicator-data-attrs';
import { defineComponent } from '../manifest';

export default defineComponent<VolumeIndicatorProps>()({
  name: 'VolumeIndicator',
  parts: ['Root', 'Fill', 'Value'] as const,
  dataAttrs: VolumeIndicatorDataAttrs,
});
