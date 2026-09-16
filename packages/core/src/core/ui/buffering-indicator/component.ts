import { defineComponent } from 'vjsc/components';

import type { BufferingIndicatorProps } from './core';
import { BufferingIndicatorDataAttrs } from './data';

export default defineComponent<BufferingIndicatorProps>({
  name: 'BufferingIndicator',
  dataAttrs: BufferingIndicatorDataAttrs,
});
