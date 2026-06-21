import { defineComponent, defineComponentPart } from '../manifest';
import { ControlsDataAttrs } from './controls-data-attrs';

export default defineComponent()({
  name: 'Controls',
  parts: {
    Root: defineComponentPart(),
    Group: defineComponentPart(),
  },
  dataAttrs: ControlsDataAttrs,
});
