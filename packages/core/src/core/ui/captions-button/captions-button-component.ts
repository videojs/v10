import { defineComponent } from 'vjsc/components';

import type { CaptionsButtonProps } from './core';
import { CaptionsButtonDataAttrs } from './data';

export default defineComponent<CaptionsButtonProps>({
  name: 'CaptionsButton',
  dataAttrs: CaptionsButtonDataAttrs,
});
