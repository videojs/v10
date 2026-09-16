import { defineComponent } from 'vjsc/components';

import type { ControlsProps } from './core';
import { ControlsDataAttrs } from './data';

export default defineComponent({
  name: 'Controls',
  root: 'Root',
  parts: {
    Root: defineComponent<ControlsProps>(),
    Backdrop: defineComponent(),
    Content: defineComponent(),
    Group: defineComponent(),
  },
  dataAttrs: ControlsDataAttrs,
});
