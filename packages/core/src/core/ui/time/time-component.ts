import { defineComponent, defineComponentPart } from '../manifest';
import type { TimeProps } from './props';
import { TimeDataAttrs } from './time-data-attrs';

export default defineComponent()({
  name: 'Time',
  parts: {
    Group: defineComponentPart(),
    Separator: defineComponentPart(),
    Value: defineComponentPart<TimeProps>(),
  },
  dataAttrs: TimeDataAttrs,
});
