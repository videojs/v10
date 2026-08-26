import { defineComponent } from 'vjsc/components';

import type { PlayButtonProps } from './core';
import { PlayButtonDataAttrs } from './data';

export default defineComponent<PlayButtonProps>({
  name: 'PlayButton',
  dataAttrs: PlayButtonDataAttrs,
});
