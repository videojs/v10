import { defineComponent } from 'vjsc/components';

import type { TimeProps } from './core';
import { TimeDataAttrs } from './data';

export default defineComponent({
  name: 'Time',
  parts: {
    Group: defineComponent(),
    Separator: defineComponent(),
    Value: defineComponent<TimeProps>(),
  },
  dataAttrs: TimeDataAttrs,
});
