import { defineComponent } from '../manifest';
import type { BufferingIndicatorProps } from './buffering-indicator-core';
import { BufferingIndicatorDataAttrs } from './buffering-indicator-data-attrs';

export default defineComponent<BufferingIndicatorProps>()({
  name: 'BufferingIndicator',
  dataAttrs: BufferingIndicatorDataAttrs,
});
