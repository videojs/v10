import { defineComponent } from '@videojs/compiler/components';

import type { PiPButtonProps } from './pip-button-core';
import { PiPButtonDataAttrs } from './pip-button-data-attrs';

export default defineComponent<PiPButtonProps>({
  name: 'PiPButton',
  dataAttrs: PiPButtonDataAttrs,
});
