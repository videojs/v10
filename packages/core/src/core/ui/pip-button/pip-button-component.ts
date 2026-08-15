import { defineComponent } from '@videojs/jsx';

import type { PiPButtonProps } from './pip-button-core';
import { PiPButtonDataAttrs } from './pip-button-data-attrs';

export default defineComponent<PiPButtonProps>({
  name: 'PiPButton',
  dataAttrs: PiPButtonDataAttrs,
});
