import { VolumeIndicatorDataAttrs } from '../input-feedback/volume-indicator-data-attrs';
import { defineComponent, defineComponentPart } from '../manifest';
import type { VolumeIndicatorProps } from './props';

export default defineComponent()({
  name: 'VolumeIndicator',
  parts: {
    Root: defineComponentPart<VolumeIndicatorProps>(),
    Fill: defineComponentPart(),
    Value: defineComponentPart(),
  },
  dataAttrs: VolumeIndicatorDataAttrs,
});
