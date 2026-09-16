import { defineComponent } from 'vjsc/components';

import type { PlaybackRateButtonProps } from './core';
import { PlaybackRateButtonDataAttrs } from './data';

export default defineComponent<PlaybackRateButtonProps>({
  name: 'PlaybackRateButton',
  dataAttrs: PlaybackRateButtonDataAttrs,
});
