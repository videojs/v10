import { defineComponent } from 'vjsc/components';

import type { PlaybackRateRadioGroupProps } from './core';
import { PlaybackRateRadioGroupDataAttrs } from './data';

export default defineComponent<PlaybackRateRadioGroupProps>({
  name: 'PlaybackRateRadioGroup',
  dataAttrs: PlaybackRateRadioGroupDataAttrs,
});
