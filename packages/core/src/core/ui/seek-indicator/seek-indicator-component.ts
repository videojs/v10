import { SeekIndicatorDataAttrs } from '../input-feedback/seek-indicator-data-attrs';
import { defineComponent, defineComponentPart } from '../manifest';
import type { SeekIndicatorProps } from './props';

export default defineComponent()({
  name: 'SeekIndicator',
  parts: {
    Root: defineComponentPart<SeekIndicatorProps>(),
    Value: defineComponentPart(),
  },
  dataAttrs: SeekIndicatorDataAttrs,
});
