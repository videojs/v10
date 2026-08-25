import { defineComponent } from 'vjsc/components';

import type { CaptionsRadioGroupProps } from './core';
import { CaptionsRadioGroupDataAttrs } from './data';

export default defineComponent<CaptionsRadioGroupProps>({
  name: 'CaptionsRadioGroup',
  dataAttrs: CaptionsRadioGroupDataAttrs,
});
