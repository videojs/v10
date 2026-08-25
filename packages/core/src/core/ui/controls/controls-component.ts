import { defineComponent } from 'vjsc/components';

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
