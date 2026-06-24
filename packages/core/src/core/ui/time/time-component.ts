import { defineComponent } from '../manifest';
import type { TimeProps } from './props';
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
