import { defineComponent } from '../manifest';
import { BufferingIndicatorDataAttrs } from './buffering-indicator-data-attrs';
import type { BufferingIndicatorProps } from './props';

export default defineComponent<BufferingIndicatorProps>()({
  name: 'BufferingIndicator',
  dataAttrs: BufferingIndicatorDataAttrs,
});
