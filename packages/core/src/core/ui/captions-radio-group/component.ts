import { defineComponent } from 'vjsc/components';

import type { CaptionsRadioGroupProps } from './core';
import { CaptionsRadioGroupDataAttrs } from './data';

export default defineComponent({
  name: 'CaptionsRadioGroup',
  parts: {
    Root: defineComponent<CaptionsRadioGroupProps>({ element: false }),
    Value: defineComponent(),
    Options: defineComponent(),
  },
  dataAttrs: CaptionsRadioGroupDataAttrs,
});
