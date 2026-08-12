import { defineComponent } from '@videojs/jsx';
import { ControlsDataAttrs } from './data';

export default defineComponent({
  name: 'Controls',
  parts: {
    Root: defineComponent(),
    Group: defineComponent(),
  },
  dataAttrs: ControlsDataAttrs,
});
