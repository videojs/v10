import { defineComponent } from '@videojs/compiler/components';
import { ControlsDataAttrs } from './controls-data-attrs';

export default defineComponent({
  name: 'Controls',
  root: 'Root',
  parts: {
    Root: defineComponent(),
    Group: defineComponent(),
  },
  dataAttrs: ControlsDataAttrs,
});
