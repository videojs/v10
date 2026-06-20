import { defineComponent } from '../manifest';
import type { TimeProps } from './time-core';
import { TimeDataAttrs } from './time-data-attrs';

export default defineComponent<TimeProps>()({
  name: 'Time',
  parts: ['Group', 'Separator', 'Value'] as const,
  dataAttrs: TimeDataAttrs,
});
