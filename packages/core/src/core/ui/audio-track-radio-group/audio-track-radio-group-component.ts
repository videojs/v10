import { defineComponent } from 'vjsc/components';

import type { AudioTrackRadioGroupProps } from './core';
import { AudioTrackRadioGroupDataAttrs } from './data';

export default defineComponent<AudioTrackRadioGroupProps>({
  name: 'AudioTrackRadioGroup',
  dataAttrs: AudioTrackRadioGroupDataAttrs,
});
