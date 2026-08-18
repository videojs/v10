import { defineComponent } from '@videojs/jsx';
import type { TimeProps } from './time-core';
import { TimeDataAttrs } from './time-data-attrs';

export default defineComponent({
  name: 'Time',
  parts: {
    Group: defineComponent(),
    Separator: defineComponent(),
    Value: defineComponent<TimeProps>(),
  },
  dataAttrs: TimeDataAttrs,
});
