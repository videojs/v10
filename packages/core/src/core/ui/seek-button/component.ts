import { defineComponent } from 'vjsc/components';

import type { SeekButtonProps } from './core';
import { SeekButtonDataAttrs } from './data';

export default defineComponent<SeekButtonProps>({
  name: 'SeekButton',
  dataAttrs: SeekButtonDataAttrs,
});
