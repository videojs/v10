import { defineComponent } from '../manifest';
import { ControlsDataAttrs } from './controls-data-attrs';

export default defineComponent()({
  name: 'Controls',
  parts: ['Root', 'Group'] as const,
  dataAttrs: ControlsDataAttrs,
});
