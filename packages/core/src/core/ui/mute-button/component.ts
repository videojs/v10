import { defineComponent } from 'vjsc/components';

import type { MuteButtonProps } from './core';
import { MuteButtonDataAttrs } from './data';

export default defineComponent<MuteButtonProps>({
  name: 'MuteButton',
  dataAttrs: MuteButtonDataAttrs,
});
