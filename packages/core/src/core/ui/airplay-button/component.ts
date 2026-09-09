import { defineComponent } from 'vjsc/components';

import type { AirPlayButtonProps } from './core';
import { AirPlayButtonDataAttrs } from './data';

export default defineComponent<AirPlayButtonProps>({
  name: 'AirPlayButton',
  dataAttrs: AirPlayButtonDataAttrs,
});
