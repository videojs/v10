import { VolumeIndicatorDataAttrs } from '../input-feedback/volume-indicator-data-attrs';
import { defineComponent } from '../manifest';
import type { VolumeIndicatorProps } from './props';

export default defineComponent({
  name: 'VolumeIndicator',
  parts: {
    Root: defineComponent<VolumeIndicatorProps>(),
    Fill: defineComponent(),
    Value: defineComponent(),
  },
  dataAttrs: VolumeIndicatorDataAttrs,
});
