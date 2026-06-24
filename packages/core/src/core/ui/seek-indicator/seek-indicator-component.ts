import { SeekIndicatorDataAttrs } from '../input-feedback/seek-indicator-data-attrs';
import { defineComponent } from '../manifest';
import type { SeekIndicatorProps } from './props';

export default defineComponent({
  name: 'SeekIndicator',
  parts: {
    Root: defineComponent<SeekIndicatorProps>(),
    Value: defineComponent(),
  },
  dataAttrs: SeekIndicatorDataAttrs,
});
