import { defineComponent } from 'vjsc/components';

import { ControlsDataAttrs } from './data';

export default defineComponent({
  name: 'Controls',
  root: 'Root',
  parts: {
    Root: defineComponent(),
    Backdrop: defineComponent(),
    Content: defineComponent(),
    Group: defineComponent(),
  },
  dataAttrs: ControlsDataAttrs,
});
