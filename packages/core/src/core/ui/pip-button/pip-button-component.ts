import { defineComponent } from 'vjsc/components';

import type { PiPButtonProps } from './core';
import { PiPButtonDataAttrs } from './data';

export default defineComponent<PiPButtonProps>({
  name: 'PiPButton',
  dataAttrs: PiPButtonDataAttrs,
});
